// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

use tauri::Manager;
use tauri_plugin_store::StoreExt;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn save_jira_config(
    app: tauri::AppHandle,
    url: String,
    email: String,
    token: String,
) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;
    
    store.set("jira_url", serde_json::json!(url));
    store.set("jira_email", serde_json::json!(email));
    store.set("jira_token", serde_json::json!(token));
    
    store.save().map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn get_jira_config(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;
    
    let url = store.get("jira_url").cloned().unwrap_or(serde_json::json!(null));
    let email = store.get("jira_email").cloned().unwrap_or(serde_json::json!(null));
    let token = store.get("jira_token").cloned().unwrap_or(serde_json::json!(null));
    
    Ok(serde_json::json!({
        "url": url,
        "email": email,
        "token": token,
    }))
}

#[tauri::command]
async fn clear_jira_config(app: tauri::AppHandle) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;
    
    store.delete("jira_url");
    store.delete("jira_email");
    store.delete("jira_token");
    
    store.save().map_err(|e| e.to_string())?;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            save_jira_config,
            get_jira_config,
            clear_jira_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
