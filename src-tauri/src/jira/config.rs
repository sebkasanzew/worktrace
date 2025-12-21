use crate::jira::types::{AppSettings, GeneralSettings, JiraSettings, WorklogType};
#[cfg(not(target_os = "macos"))]
use keyring::Entry;
use tauri::Manager;
use tauri_plugin_store::StoreExt;

const SERVICE_NAME: &str = "worktrace";
const KEYRING_USER_KEY: &str = "current_jira_user";

#[cfg(target_os = "macos")]
fn set_password_macos(service: &str, user: &str, password: &str) -> Result<(), String> {
    use std::process::Command;
    log::debug!(target: "jira", "Setting password via security CLI for {}/{}", service, user);
    let output = Command::new("security")
        .args(["add-generic-password", "-a", user, "-s", service, "-w", password, "-U"])
        .output()
        .map_err(|e| e.to_string())?;
        
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        log::error!(target: "jira", "Security CLI set failed: {}", err);
        return Err(err);
    }
    Ok(())
}

#[cfg(target_os = "macos")]
fn get_password_macos(service: &str, user: &str) -> Result<String, String> {
    use std::process::Command;
    log::debug!(target: "jira", "Getting password via security CLI for {}/{}", service, user);
    let output = Command::new("security")
        .args(["find-generic-password", "-a", user, "-s", service, "-w"])
        .output()
        .map_err(|e| e.to_string())?;
        
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        // Don't log error here as it's expected if token doesn't exist
        return Err(err);
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[cfg(target_os = "macos")]
fn delete_password_macos(service: &str, user: &str) -> Result<(), String> {
    use std::process::Command;
    let _ = Command::new("security")
        .args(["delete-generic-password", "-a", user, "-s", service])
        .output()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(not(target_os = "macos"))]
fn get_keyring_entry() -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, KEYRING_USER_KEY).map_err(|e| e.to_string())
}

/// Delete the config file to reset corrupted state
fn reset_config_file(app: &tauri::AppHandle) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let config_path = app_data_dir.join("config.json");

    if config_path.exists() {
        log::warn!(target: "jira", "Deleting corrupted config file: {:?}", config_path);
        std::fs::remove_file(&config_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn load_jira_settings(store: &tauri_plugin_store::Store<tauri::Wry>) -> Option<JiraSettings> {
    let value = store.get("jira")?;
    let mut settings: JiraSettings = serde_json::from_value(value.clone()).ok()?;

    // Try to load token from keyring
    #[cfg(target_os = "macos")]
    {
        match get_password_macos(SERVICE_NAME, KEYRING_USER_KEY) {
            Ok(token) => {
                log::info!(target: "jira", "Successfully loaded token from keyring (CLI)");
                settings.api_token = token;
            }
            Err(e) => {
                log::warn!(target: "jira", "Failed to load token from keyring (CLI): {}", e);
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    match get_keyring_entry().and_then(|e| e.get_password().map_err(|e| e.to_string())) {
        Ok(token) => {
            log::info!(target: "jira", "Successfully loaded token from keyring");
            settings.api_token = token;
        }
        Err(e) => {
            log::error!(target: "jira", "Failed to load token from keyring: {}", e);
        }
    }

    if settings.api_token.is_empty() {
        log::warn!(target: "jira", "API token is empty after loading from keyring");
    }

    Some(settings)
}

#[tauri::command]
#[specta::specta]
pub async fn save_jira_config(
    app: tauri::AppHandle,
    settings: JiraSettings,
) -> Result<(), String> {
    if settings.api_token.is_empty() {
        return Err("API token cannot be empty".to_string());
    }

    let store = app.store("config.json").map_err(|e| e.to_string())?;

    // Save token to keyring
    log::info!(target: "jira", "Saving token to keyring for service: {}, user: {}", SERVICE_NAME, KEYRING_USER_KEY);
    
    #[cfg(target_os = "macos")]
    {
        match set_password_macos(SERVICE_NAME, KEYRING_USER_KEY, &settings.api_token) {
            Ok(_) => {
                log::info!(target: "jira", "Successfully saved token to keyring (CLI)");
                // Verify immediately
                match get_password_macos(SERVICE_NAME, KEYRING_USER_KEY) {
                    Ok(saved) => {
                         if saved == settings.api_token {
                             log::info!(target: "jira", "Verification successful: Token read back matches");
                         } else {
                             log::error!(target: "jira", "Verification failed: Token read back does not match");
                         }
                    },
                    Err(e) => log::error!(target: "jira", "Verification failed: Could not read back token: {}", e),
                }
            },
            Err(e) => {
                log::error!(target: "jira", "Failed to save token to keyring (CLI): {}", e);
                return Err(e.to_string());
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let entry = get_keyring_entry()?;
        match entry.set_password(&settings.api_token) {
            Ok(_) => {
                log::info!(target: "jira", "Successfully saved token to keyring");
                // Verify immediately by reading back
                match get_keyring_entry().and_then(|e| e.get_password().map_err(|e| e.to_string())) {
                    Ok(saved) => {
                        if saved == settings.api_token {
                            log::info!(target: "jira", "Verification successful: Token read back matches");
                        } else {
                            log::error!(target: "jira", "Verification failed: Token read back does not match");
                            return Err("Token verification failed: saved token does not match".to_string());
                        }
                    },
                    Err(e) => {
                        log::error!(target: "jira", "Verification failed: Could not read back token: {}", e);
                        return Err(format!("Token verification failed: {}", e));
                    }
                }
            },
            Err(e) => {
                log::error!(target: "jira", "Failed to save token to keyring: {}", e);
                return Err(e.to_string());
            }
        }
    }

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
    let store = match app.store("config.json") {
        Ok(s) => s,
        Err(e) => {
            log::error!(target: "jira", "Failed to open config store, resetting: {}", e);
            reset_config_file(&app)?;
            return Ok(None);
        }
    };
    Ok(load_jira_settings(&store))
}

#[tauri::command]
#[specta::specta]
pub async fn clear_jira_config(app: tauri::AppHandle) -> Result<(), String> {
    log::info!(target: "jira", "Clearing JIRA configuration");
    
    let store = match app.store("config.json") {
        Ok(s) => s,
        Err(e) => {
            log::error!(target: "jira", "Failed to open config store, resetting: {}", e);
            reset_config_file(&app)?;
            clear_keyring();
            return Ok(());
        }
    };

    store.delete("jira");
    store.save().map_err(|e| e.to_string())?;
    clear_keyring();

    Ok(())
}

/// Clear credentials from keyring (best effort)
fn clear_keyring() {
    log::info!(target: "jira", "Deleting credential from keyring");
    
    #[cfg(target_os = "macos")]
    let _ = delete_password_macos(SERVICE_NAME, KEYRING_USER_KEY);

    #[cfg(not(target_os = "macos"))]
    if let Ok(entry) = get_keyring_entry() {
        let _ = entry.delete_credential();
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_app_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let store = match app.store("config.json") {
        Ok(s) => s,
        Err(e) => {
            log::error!(target: "jira", "Failed to open config store, resetting: {}", e);
            reset_config_file(&app)?;
            // Return defaults after reset
            return Ok(AppSettings {
                general: default_general_settings(),
                jira: None,
            });
        }
    };

    let mut general: GeneralSettings = store
        .get("general")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_else(default_general_settings);

    // If language is not set (e.g. old config), use OS locale
    if general.language.is_none() {
        general.language = sys_locale::get_locale()
            .map(|l| {
                if l.starts_with("zh-Hans") {
                    "zh-Hans".to_string()
                } else if l.starts_with("pt-BR") {
                    "pt-BR".to_string()
                } else if l.starts_with("pt-PT") {
                    "pt-PT".to_string()
                } else {
                    l.split('-').next().unwrap_or("en").to_string()
                }
            })
            .or(Some("en".to_string()));
    }

    let jira = load_jira_settings(&store);

    Ok(AppSettings { general, jira })
}

#[tauri::command]
#[specta::specta]
pub async fn save_app_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    let store = app.store("config.json").map_err(|e| e.to_string())?;

    store.set("general", serde_json::json!(settings.general));
    if let Some(jira) = settings.jira {
        if !jira.api_token.is_empty() {
            // Save token to keyring
            log::info!(target: "jira", "Updating token in keyring from app settings");
            
            #[cfg(target_os = "macos")]
            {
                set_password_macos(SERVICE_NAME, KEYRING_USER_KEY, &jira.api_token)?;
            }
            
            #[cfg(not(target_os = "macos"))]
            {
                let entry = get_keyring_entry()?;
                entry
                    .set_password(&jira.api_token)
                    .map_err(|e| e.to_string())?;
            }
        }

        // Prepare jira settings for store
        let mut stored_jira = jira;
        stored_jira.api_token = String::new();
        store.set("jira", serde_json::json!(stored_jira));
    } else {
        log::info!(target: "jira", "JIRA settings missing in save_app_settings, deleting from keyring");
        
        store.delete("jira");
        clear_keyring();
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
    let language = sys_locale::get_locale()
        .map(|l| {
            // Normalize locale (e.g., en-US -> en, zh-Hans-CN -> zh-Hans)
            if l.starts_with("zh-Hans") {
                "zh-Hans".to_string()
            } else if l.starts_with("pt-BR") {
                "pt-BR".to_string()
            } else if l.starts_with("pt-PT") {
                "pt-PT".to_string()
            } else {
                l.split('-').next().unwrap_or("en").to_string()
            }
        })
        .or(Some("en".to_string()));

    GeneralSettings {
        theme: "system".to_string(),
        rounding_step: 0,
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
        enable_automatic_updates: true,
        always_on_top: false,
        custom_issue_keys: vec![],
        language,
    }
}

/// Reset all app configuration to defaults
/// This is a recovery command for when config is corrupted
#[tauri::command]
#[specta::specta]
pub async fn reset_all_config(app: tauri::AppHandle) -> Result<(), String> {
    log::warn!(target: "jira", "Resetting all configuration to defaults");
    reset_config_file(&app)?;
    clear_keyring();
    Ok(())
}
