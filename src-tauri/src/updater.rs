use serde::Serialize;
use specta::Type;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_updater::UpdaterExt;
use url::Url;

pub struct UpdaterState(pub Mutex<Option<tauri_plugin_updater::Update>>);

#[derive(Serialize, Clone, Type)]
pub struct UpdateInfo {
    available: bool,
    current_version: String,
    version: String,
    body: Option<String>,
    date: Option<String>,
}

#[tauri::command]
#[specta::specta]
pub async fn check_update(
    app: AppHandle,
    state: State<'_, UpdaterState>,
) -> Result<UpdateInfo, String> {
    // 1. Try default updater
    let default_update = if let Ok(updater) = app.updater() {
        updater.check().await.ok().flatten()
    } else {
        None
    };

    if let Some(update) = default_update {
        let info = UpdateInfo {
            available: true,
            current_version: update.current_version.clone(),
            version: update.version.clone(),
            body: update.body.clone(),
            date: update.date.map(|d| d.to_string()),
        };
        *state.0.lock().unwrap() = Some(update);
        return Ok(info);
    }

    // 2. Fallback: Check GitHub releases
    let client = reqwest::Client::new();
    let releases: Vec<serde_json::Value> = client
        .get("https://api.github.com/repos/sebkasanzew/worktrace/releases")
        .header("User-Agent", "worktrace")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    for release in releases {
        let Some(assets) = release["assets"].as_array() else {
            continue;
        };

        for asset in assets {
            let Some(name) = asset["name"].as_str() else {
                continue;
            };

            if name != "latest.json" {
                continue;
            }

            let Some(url_str) = asset["browser_download_url"].as_str() else {
                continue;
            };

            let Ok(url) = Url::parse(url_str) else {
                continue;
            };

            let Ok(builder) = app.updater_builder().endpoints(vec![url]) else {
                continue;
            };

            let Ok(updater) = builder.build() else {
                continue;
            };

            if let Ok(Some(update)) = updater.check().await {
                let info = UpdateInfo {
                    available: true,
                    current_version: update.current_version.clone(),
                    version: update.version.clone(),
                    body: update.body.clone(),
                    date: update.date.map(|d| d.to_string()),
                };
                *state.0.lock().unwrap() = Some(update);
                return Ok(info);
            }
        }
    }

    Ok(UpdateInfo {
        available: false,
        current_version: app.package_info().version.to_string(),
        version: "".to_string(),
        body: None,
        date: None,
    })
}

#[derive(Serialize, Clone)]
struct ProgressEvent {
    event: String,
    chunk_length: Option<usize>,
    content_length: Option<u64>,
}

#[tauri::command]
#[specta::specta]
pub async fn install_update(
    app: AppHandle,
    state: State<'_, UpdaterState>,
) -> Result<(), String> {
    let update = state.0.lock().unwrap().take();
    if let Some(update) = update {
        let app_clone = app.clone();
        update
            .download_and_install(
                move |chunk_length, content_length| {
                    let _ = app_clone.emit(
                        "update-progress",
                        ProgressEvent {
                            event: "Progress".to_string(),
                            chunk_length: Some(chunk_length),
                            content_length,
                        },
                    );
                },
                move || {
                    let _ = app.emit(
                        "update-progress",
                        ProgressEvent {
                            event: "Finished".to_string(),
                            chunk_length: None,
                            content_length: None,
                        },
                    );
                },
            )
            .await
            .map_err(|e| e.to_string())?;
    } else {
        return Err("No update available to install".to_string());
    }
    Ok(())
}
