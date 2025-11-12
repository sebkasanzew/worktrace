// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use gouqi::{Credentials, Jira};
use tauri::Emitter;
use tauri::menu::MenuItemBuilder;
use tauri_plugin_store::StoreExt;

#[cfg(not(target_os = "macos"))]
use tauri::menu::{MenuBuilder, SubmenuBuilder};

#[tauri::command]
fn jira_get_current_user(
    url: String,
    username: String,
    password: String,
) -> Result<serde_json::Value, String> {
    log::info!(target: "jira", "Getting current user info");

    let credentials = Credentials::Basic(username, password);
    let jira =
        Jira::new(&url, credentials).map_err(|e| format!("Failed to create JIRA client: {}", e))?;

    let session = jira
        .session()
        .map_err(|e| format!("Failed to get session: {}", e))?;

    log::debug!(target: "jira", "User authenticated: {}", session.name);

    // Convert session to JSON
    let user_info = serde_json::to_value(&session)
        .map_err(|e| format!("Failed to serialize session: {}", e))?;

    Ok(user_info)
}

#[tauri::command]
fn jira_api_request(
    url: String,
    username: String,
    password: String,
    jql: String,
) -> Result<serde_json::Value, String> {
    log::info!(target: "jira", "Making JIRA API request");
    log::debug!(target: "jira", "URL: {}", url);
    log::debug!(target: "jira", "Username: {}", username);
    log::debug!(target: "jira", "JQL: {}", jql);

    let credentials = Credentials::Basic(username, password);
    let jira =
        Jira::new(&url, credentials).map_err(|e| format!("Failed to create JIRA client: {}", e))?;

    // Use gouqi's search functionality
    let search_options = gouqi::SearchOptions::builder()
        .fields(vec![
            "summary", "status", "assignee", "updated", "created", "key",
        ])
        .build();
    let results = jira
        .search()
        .list(&jql, &search_options)
        .map_err(|e| format!("Failed to search issues: {}", e))?;

    log::info!(target: "jira", "Found {} issues", results.total);

    // Transform the results to match the expected frontend structure
    let issues: Vec<serde_json::Value> = results
        .issues
        .iter()
        .map(|issue| {
            let updated = issue.updated().map(|dt| dt.unix_timestamp()).unwrap_or(0);
            let created = issue.created().map(|dt| dt.unix_timestamp()).unwrap_or(0);

            serde_json::json!({
                "id": issue.id,
                "key": issue.key,
                "fields": {
                    "summary": issue.summary().unwrap_or_default(),
                    "status": {
                        "name": issue.status().map(|s| s.name).unwrap_or_default()
                    },
                    "assignee": issue.assignee().map(|a| serde_json::json!({
                        "displayName": a.display_name,
                        "emailAddress": a.email_address
                    })),
                    "updated": updated * 1000, // Convert to milliseconds for JavaScript Date
                    "created": created * 1000, // Convert to milliseconds for JavaScript Date
                }
            })
        })
        .collect();

    let json_response = serde_json::json!({
        "issues": issues,
        "total": results.total,
        "isLast": results.is_last_page.unwrap_or(false)
    });

    Ok(json_response)
}

#[tauri::command]
async fn save_jira_config(
    app: tauri::AppHandle,
    url: String,
    username: String,
    password: String,
) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    store.set("jira_url", serde_json::json!(url));
    store.set("jira_username", serde_json::json!(username));
    store.set("jira_password", serde_json::json!(password));

    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_jira_config(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    let url = store.get("jira_url").unwrap_or(serde_json::Value::Null);
    let username = store
        .get("jira_username")
        .unwrap_or(serde_json::Value::Null);
    let password = store
        .get("jira_password")
        .unwrap_or(serde_json::Value::Null);

    Ok(serde_json::json!({
        "url": url,
        "username": username,
        "password": password,
    }))
}

#[tauri::command]
async fn clear_jira_config(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    store.delete("jira_url");
    store.delete("jira_username");
    store.delete("jira_password");

    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .level_for("jira", log::LevelFilter::Debug) // Enable debug logs for JIRA requests
                .targets([
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir {
                        file_name: None,
                    }),
                ])
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Build the menu
            let check_updates = MenuItemBuilder::new("Check for Updates")
                .id("check_updates")
                .build(app)?;

            // Get the default menu and add our menu item to existing Help submenu
            #[cfg(target_os = "macos")]
            {
                use tauri::menu::{HELP_SUBMENU_ID, Menu, MenuItemKind};
                let menu = Menu::default(app.handle())?;

                // Find the Help submenu and add our item to it
                if let Some(MenuItemKind::Submenu(help_submenu)) = menu.get(HELP_SUBMENU_ID) {
                    help_submenu.append(&check_updates)?;
                }

                app.set_menu(menu)?;
            }

            #[cfg(not(target_os = "macos"))]
            {
                use tauri::menu::SubmenuBuilder;
                let help_submenu = SubmenuBuilder::new(app, "Help")
                    .item(&check_updates)
                    .build()?;

                let menu = MenuBuilder::new(app).item(&help_submenu).build()?;
                app.set_menu(menu)?;
            }

            // Listen for menu events
            app.on_menu_event(move |app, event| {
                if event.id() == "check_updates" {
                    log::info!("Check for Updates menu item clicked");
                    // Emit event to frontend
                    let _ = app.emit("menu://check-for-updates", ());
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_jira_config,
            get_jira_config,
            clear_jira_config,
            jira_api_request,
            jira_get_current_user
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
