use crate::jira::types::{JiraConfig, AppSettings, WorklogType};
use tauri_plugin_store::StoreExt;

#[tauri::command]
#[specta::specta]
pub async fn save_jira_config(
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
#[specta::specta]
pub async fn get_jira_config(app: tauri::AppHandle) -> Result<JiraConfig, String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    let url = store
        .get("jira_url")
        .and_then(|v| v.as_str().map(String::from));
    let username = store
        .get("jira_username")
        .and_then(|v| v.as_str().map(String::from));
    let password = store
        .get("jira_password")
        .and_then(|v| v.as_str().map(String::from));

    Ok(JiraConfig {
        url,
        username,
        password,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn clear_jira_config(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    store.delete("jira_url");
    store.delete("jira_username");
    store.delete("jira_password");

    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_app_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    let jira_instance_url = store.get("jira_url").and_then(|v| v.as_str().map(String::from)).unwrap_or_default();
    let jira_username = store.get("jira_username").and_then(|v| v.as_str().map(String::from)).unwrap_or_default();
    let jira_api_token = store.get("jira_password").and_then(|v| v.as_str().map(String::from)).unwrap_or_default();
    
    let theme = store.get("theme").and_then(|v| v.as_str().map(String::from)).unwrap_or_else(|| "system".to_string());
    
    let worklog_types = store.get("worklog_types")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_else(|| vec![
            WorklogType { name: "Development".to_string(), short_code: "(D)".to_string() },
            WorklogType { name: "Meeting".to_string(), short_code: "(M)".to_string() },
        ]);

    let default_worklog_description = store.get("default_worklog_description")
        .and_then(|v| v.as_str().map(String::from))
        .unwrap_or_default();

    let enable_automatic_updates = store.get("enable_automatic_updates")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let always_on_top = store.get("always_on_top")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let custom_issue_keys = store.get("custom_issue_keys")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();

    Ok(AppSettings {
        jira_instance_url,
        jira_username,
        jira_api_token,
        theme,
        worklog_types,
        default_worklog_description,
        enable_automatic_updates,
        always_on_top,
        custom_issue_keys,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn save_app_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    store.set("jira_url", serde_json::json!(settings.jira_instance_url));
    store.set("jira_username", serde_json::json!(settings.jira_username));
    store.set("jira_password", serde_json::json!(settings.jira_api_token));
    store.set("theme", serde_json::json!(settings.theme));
    store.set("worklog_types", serde_json::json!(settings.worklog_types));
    store.set("default_worklog_description", serde_json::json!(settings.default_worklog_description));
    store.set("enable_automatic_updates", serde_json::json!(settings.enable_automatic_updates));
    store.set("always_on_top", serde_json::json!(settings.always_on_top));
    store.set("custom_issue_keys", serde_json::json!(settings.custom_issue_keys));

    store.save().map_err(|e| e.to_string())?;

    use tauri::Manager;
    if let Some(window) = app.get_webview_window("main") {
        window.set_always_on_top(settings.always_on_top).map_err(|e| e.to_string())?;
    }

    Ok(())
}
