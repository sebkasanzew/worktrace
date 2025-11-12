use gouqi::{Credentials, Jira};

#[tauri::command]
pub fn jira_get_current_user(
    url: String,
    username: String,
    password: String,
) -> Result<serde_json::Value, String> {
    log::info!(target: "jira", "Getting current user info");

    let credentials = Credentials::Basic(username, password);
    let jira =
        Jira::new(&url, credentials).map_err(|e| format!("Failed to create JIRA client: {}", e))?;

    let session = jira
        .session()
        .map_err(|e| format!("Failed to get session: {}", e))?;

    log::debug!(target: "jira", "User authenticated: {}", session.name);

    // Convert session to JSON
    let user_info = serde_json::to_value(&session)
        .map_err(|e| format!("Failed to serialize session: {}", e))?;

    Ok(user_info)
}

#[tauri::command]
pub fn jira_api_request(
    url: String,
    username: String,
    password: String,
    jql: String,
) -> Result<serde_json::Value, String> {
    log::info!(target: "jira", "Making JIRA API request");
    log::debug!(target: "jira", "URL: {}", url);
    log::debug!(target: "jira", "Username: {}", username);
    log::debug!(target: "jira", "JQL: {}", jql);

    let credentials = Credentials::Basic(username, password);
    let jira =
        Jira::new(&url, credentials).map_err(|e| format!("Failed to create JIRA client: {}", e))?;

    // Use gouqi's search functionality
    let search_options = gouqi::SearchOptions::builder()
        .fields(vec![
            "summary", "status", "assignee", "updated", "created", "key",
        ])
        .build();
    let results = jira
        .search()
        .list(&jql, &search_options)
        .map_err(|e| format!("Failed to search issues: {}", e))?;

    log::info!(target: "jira", "Found {} issues", results.total);

    // Transform the results to match the expected frontend structure
    let issues: Vec<serde_json::Value> = results
        .issues
        .iter()
        .map(|issue| {
            let updated = issue.updated().map(|dt| dt.unix_timestamp()).unwrap_or(0);
            let created = issue.created().map(|dt| dt.unix_timestamp()).unwrap_or(0);

            serde_json::json!({
                "id": issue.id,
                "key": issue.key,
                "fields": {
                    "summary": issue.summary().unwrap_or_default(),
                    "status": {
                        "name": issue.status().map(|s| s.name).unwrap_or_default()
                    },
                    "assignee": issue.assignee().map(|a| serde_json::json!({
                        "displayName": a.display_name,
                        "emailAddress": a.email_address
                    })),
                    "updated": updated * 1000, // Convert to milliseconds for JavaScript Date
                    "created": created * 1000, // Convert to milliseconds for JavaScript Date
                }
            })
        })
        .collect();

    let json_response = serde_json::json!({
        "issues": issues,
        "total": results.total,
        "isLast": results.is_last_page.unwrap_or(false)
    });

    Ok(json_response)
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

    #[test]
    fn test_jira_api_request_empty_jql() {
        let result = jira_api_request(
            "https://test.atlassian.net".to_string(),
            "test@example.com".to_string(),
            "test-token".to_string(),
            "".to_string(),
        );

        // Should handle empty JQL gracefully
        assert!(result.is_err());
    }
}
