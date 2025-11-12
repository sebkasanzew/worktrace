use tauri_plugin_store::StoreExt;

#[tauri::command]
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
pub async fn get_jira_config(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
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
pub async fn clear_jira_config(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    store.delete("jira_url");
    store.delete("jira_username");
    store.delete("jira_password");

    store.save().map_err(|e| e.to_string())?;

    Ok(())
}
