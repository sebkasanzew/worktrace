use crate::jira::types::{AppSettings, GeneralSettings, JiraSettings, WorklogType};
use tauri_plugin_store::StoreExt;

#[tauri::command]
#[specta::specta]
pub async fn save_jira_config(
    app: tauri::AppHandle,
    settings: JiraSettings,
) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    store.set("jira", serde_json::json!(settings));
    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_jira_config(app: tauri::AppHandle) -> Result<Option<JiraSettings>, String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    if let Some(value) = store.get("jira") {
        return Ok(serde_json::from_value(value.clone()).ok());
    }

    Ok(None)
}

#[tauri::command]
#[specta::specta]
pub async fn clear_jira_config(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    store.delete("jira");
    store.save().map_err(|e| e.to_string())?;

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

    let jira: Option<JiraSettings> = store
        .get("jira")
        .and_then(|v| serde_json::from_value(v.clone()).ok());

    Ok(AppSettings { general, jira })
}

#[tauri::command]
#[specta::specta]
pub async fn save_app_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    store.set("general", serde_json::json!(settings.general));
    if let Some(jira) = settings.jira {
        store.set("jira", serde_json::json!(jira));
    } else {
        store.delete("jira");
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
