// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod bindings;
pub mod jira;
mod menu;
mod updater;

rust_i18n::i18n!("locales");

use jira::*;
use updater::*;
use std::sync::Mutex;
use tauri::{LogicalSize, Manager, PhysicalPosition, PhysicalSize};
use tauri_plugin_store::StoreExt;

struct WindowState {
    prev_size: Option<PhysicalSize<u32>>,
    prev_pos: Option<PhysicalPosition<i32>>,
}

#[tauri::command]
#[specta::specta]
async fn set_mini_mode(
    app: tauri::AppHandle,
    enable: bool,
    state: tauri::State<'_, Mutex<WindowState>>,
) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Main window not found")?;
    let mut state = state.lock().map_err(|_| "Failed to lock state")?;

    if enable {
        // Save current state
        if let Ok(size) = window.inner_size() {
            state.prev_size = Some(size);
        }
        if let Ok(pos) = window.outer_position() {
            state.prev_pos = Some(pos);
        }

        // Set mini mode
        // Clear min/max size constraints first to allow resizing to mini size if needed
        window.set_min_size(None::<PhysicalSize<u32>>).ok();
        window.set_max_size(None::<PhysicalSize<u32>>).ok();

        window.set_resizable(false).map_err(|e| e.to_string())?;
        window.set_decorations(false).map_err(|e| e.to_string())?;

        let size = LogicalSize::new(250.0, 135.0);
        window.set_size(size).map_err(|e| e.to_string())?;

        window
            .set_min_size(Some(size))
            .map_err(|e| e.to_string())?;
        window
            .set_max_size(Some(size))
            .map_err(|e| e.to_string())?;

        window.set_maximizable(false).map_err(|e| e.to_string())?;
    } else {
        // Restore state
        window.set_resizable(true).map_err(|e| e.to_string())?;
        window.set_maximizable(true).map_err(|e| e.to_string())?;
        window.set_decorations(true).map_err(|e| e.to_string())?;
        window
            .set_min_size(None::<PhysicalSize<u32>>)
            .map_err(|e| e.to_string())?;
        window
            .set_max_size(None::<PhysicalSize<u32>>)
            .map_err(|e| e.to_string())?;

        if let Some(size) = state.prev_size {
            window.set_size(size).map_err(|e| e.to_string())?;
        } else {
            window
                .set_size(PhysicalSize::new(1024, 800))
                .map_err(|e| e.to_string())?;
        }

        if let Some(pos) = state.prev_pos {
            window.set_position(pos).map_err(|e| e.to_string())?;
        }
    }
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
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            log::info!("Tauri app setup started");

            // Log app data directory for debugging
            if let Ok(app_data_dir) = app.path().app_data_dir() {
                log::info!("App data directory: {:?}", app_data_dir);
            }

            // Validate store plugin can access config files - if not, clean them up
            log::info!("Validating store access...");
            match app.store("config.json") {
                Ok(_) => log::info!("Store access validated successfully"),
                Err(e) => {
                    log::error!("Store access failed: {:?}. Will attempt config reset on first access.", e);
                }
            }

            app.manage(Mutex::new(WindowState {
                prev_size: None,
                prev_pos: None,
            }));
            app.manage(UpdaterState(Mutex::new(None)));

            // Setup application menu
            log::info!("Setting up application menu...");
            menu::setup_menu(app)?;

            #[cfg(debug_assertions)]
            bindings::export_bindings();

            log::info!("Tauri app setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_jira_config,
            get_jira_config,
            clear_jira_config,
            get_app_settings,
            save_app_settings,
            reset_all_config,
            jira_api_request,
            jira_get_current_user,
            jira_add_worklog,
            jira_update_worklog,
            jira_delete_worklog,
            jira_get_worklogs,
            jira_get_user_worklogs_by_date_range,
            set_mini_mode,
            check_update,
            install_update
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
