// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod bindings;
mod jira;
mod menu;

use jira::*;

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
            // Setup application menu
            menu::setup_menu(app)?;

            #[cfg(debug_assertions)]
            bindings::export_bindings();

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
