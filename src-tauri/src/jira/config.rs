use crate::jira::types::{AppSettings, GeneralSettings, JiraSettings, WorklogType};
use keyring::Entry;
use tauri_plugin_store::StoreExt;

const SERVICE_NAME: &str = "worktrace";
const USER_NAME: &str = "jira_api_token";

fn get_keyring_entry() -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, USER_NAME).map_err(|e| e.to_string())
}

fn load_jira_settings(store: &tauri_plugin_store::Store<tauri::Wry>) -> Option<JiraSettings> {
    let value = store.get("jira")?;
    let mut settings: JiraSettings = serde_json::from_value(value.clone()).ok()?;

    // Try to load token from keyring
    if let Ok(entry) = get_keyring_entry() {
        if let Ok(token) = entry.get_password() {
            settings.api_token = token;
        } else if !settings.api_token.is_empty() {
            // Migration: Token is in file but not in keyring. Save to keyring.
            let _ = entry.set_password(&settings.api_token);
        }
    }

    Some(settings)
}

#[tauri::command]
#[specta::specta]
pub async fn save_jira_config(
    app: tauri::AppHandle,
    settings: JiraSettings,
) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    // Save token to keyring
    let entry = get_keyring_entry()?;
    entry
        .set_password(&settings.api_token)
        .map_err(|e| e.to_string())?;

    // Save settings to store without token
    let mut stored_settings = settings;
    stored_settings.api_token = String::new();

    store.set("jira", serde_json::json!(stored_settings));
    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_jira_config(app: tauri::AppHandle) -> Result<Option<JiraSettings>, String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;
    Ok(load_jira_settings(&store))
}

#[tauri::command]
#[specta::specta]
pub async fn clear_jira_config(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    store.delete("jira");
    store.save().map_err(|e| e.to_string())?;

    if let Ok(entry) = get_keyring_entry() {
        let _ = entry.delete_credential();
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_app_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    let general: GeneralSettings = store
        .get("general")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_else(default_general_settings);

    let jira = load_jira_settings(&store);

    Ok(AppSettings { general, jira })
}

#[tauri::command]
#[specta::specta]
pub async fn save_app_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    store.set("general", serde_json::json!(settings.general));
    if let Some(jira) = settings.jira {
        // Save token to keyring
        let entry = get_keyring_entry()?;
        entry
            .set_password(&jira.api_token)
            .map_err(|e| e.to_string())?;

        // Prepare jira settings for store
        let mut stored_jira = jira;
        stored_jira.api_token = String::new();
        store.set("jira", serde_json::json!(stored_jira));
    } else {
        store.delete("jira");
        if let Ok(entry) = get_keyring_entry() {
            let _ = entry.delete_credential();
        }
    }

    store.save().map_err(|e| e.to_string())?;

    use tauri::Manager;
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_always_on_top(settings.general.always_on_top)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn default_general_settings() -> GeneralSettings {
    GeneralSettings {
        theme: "system".to_string(),
        worklog_types: vec![
            WorklogType {
                name: "Development".to_string(),
                short_code: "(D)".to_string(),
            },
            WorklogType {
                name: "Meeting".to_string(),
                short_code: "(M)".to_string(),
            },
        ],
        default_worklog_description: String::new(),
        enable_automatic_updates: false,
        always_on_top: false,
        custom_issue_keys: vec![],
    }
}
