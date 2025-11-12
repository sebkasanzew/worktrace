use crate::jira::types::JiraConfig;
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
