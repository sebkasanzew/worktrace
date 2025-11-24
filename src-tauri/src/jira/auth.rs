use super::types::*;

#[tauri::command]
#[specta::specta]
pub fn jira_get_current_user(
    url: String,
    username: String,
    password: String,
) -> Result<JiraUserSession, String> {
    log::info!(target: "jira", "Getting current user info");

    if username.contains('@') {
        log::warn!(target: "jira", "Username '{}' contains '@'. If this is JIRA Server/Data Center, you likely need to use your username (e.g. 'jdoe') instead of your email address.", username);
    }

    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::none())
        .user_agent("Worktrace/1.0")
        .build()
        .map_err(|e| format!("Failed to create client: {}", e))?;

    // Strategies to try in order: (API Version, Auth Type)
    let strategies = [
        ("3", "Basic"),
        ("2", "Basic"),
        ("2", "Bearer"),
        ("3", "Bearer"),
    ];

    let mut last_error = String::new();

    for (version, auth_type) in strategies {
        let endpoint = format!("{}/rest/api/{}/myself", url, version);
        log::debug!(target: "jira", "Trying v{} with {} Auth", version, auth_type);
        
        let mut req = client.get(&endpoint)
            .header("Accept", "application/json")
            .header("X-Atlassian-Token", "no-check");

        if auth_type == "Basic" {
            req = req.basic_auth(&username, Some(&password));
        } else {
            req = req.bearer_auth(&password);
        }

        match req.send() {
            Ok(response) => {
                let status = response.status();
                if status.is_success() {
                    let text = response.text().unwrap_or_default();
                    match serde_json::from_str::<serde_json::Value>(&text) {
                        Ok(user_data) => {
                            let name = user_data["displayName"].as_str()
                                .or_else(|| user_data["name"].as_str())
                                .unwrap_or("Unknown User")
                                .to_string();
                            log::info!(target: "jira", "User authenticated: {} (v{} {})", name, version, auth_type);
                            
                            return Ok(JiraUserSession { 
                                name,
                                api_version: version.to_string(),
                                auth_type: auth_type.to_string(),
                            });
                        },
                        Err(e) => {
                            log::warn!(target: "jira", "v{} {} returned 200 but invalid JSON: {}", version, auth_type, e);
                            last_error = format!("Invalid JSON response from JIRA: {}", e);
                        }
                    }
                } else {
                    let text = response.text().unwrap_or_default();
                    let error_preview = if text.len() > 200 { format!("{}...", &text[..200]) } else { text };
                    log::debug!(target: "jira", "v{} {} failed: {} - {}", version, auth_type, status, error_preview);
                    last_error = format!("HTTP {}: {}", status, error_preview);
                }
            },
            Err(e) => {
                log::warn!(target: "jira", "Connection failed for v{} {}: {}", version, auth_type, e);
                last_error = format!("Connection error: {}", e);
            }
        }
    }

    log::error!(target: "jira", "All authentication strategies failed. Last error: {}", last_error);
    Err(format!("Authentication failed. Last error: {}", last_error))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jira_get_current_user_invalid_credentials() {
        let result = jira_get_current_user(
            "https://invalid.atlassian.net".to_string(),
            "invalid@example.com".to_string(),
            "invalid-token".to_string(),
        );

        assert!(result.is_err());
    }
}
