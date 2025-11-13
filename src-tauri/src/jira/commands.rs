use gouqi::{Credentials, Jira, WorklogInput};
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

use super::types::*;

#[tauri::command]
#[specta::specta]
pub fn jira_get_current_user(
    url: String,
    username: String,
    password: String,
) -> Result<JiraUserSession, String> {
    log::info!(target: "jira", "Getting current user info");

    let credentials = Credentials::Basic(username, password);
    let jira =
        Jira::new(&url, credentials).map_err(|e| format!("Failed to create JIRA client: {}", e))?;

    let session = jira
        .session()
        .map_err(|e| format!("Failed to get session: {}", e))?;

    log::debug!(target: "jira", "User authenticated: {}", session.name);

    // Convert gouqi session to our typed struct
    let user_session = JiraUserSession { name: session.name };

    Ok(user_session)
}

#[tauri::command]
#[specta::specta]
pub fn jira_api_request(
    url: String,
    username: String,
    password: String,
    jql: String,
) -> Result<JiraSearchResponse, String> {
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

    // Transform the results to our typed structs
    let issues: Vec<JiraIssue> = results
        .issues
        .iter()
        .map(|issue| {
            let updated = issue.updated().map(|dt| dt.unix_timestamp()).unwrap_or(0);
            let created = issue.created().map(|dt| dt.unix_timestamp()).unwrap_or(0);

            JiraIssue {
                id: issue.id.clone(),
                key: issue.key.clone(),
                fields: JiraFields {
                    summary: issue.summary().unwrap_or_default().to_string(),
                    status: JiraStatus {
                        name: issue.status().map(|s| s.name.clone()).unwrap_or_default(),
                    },
                    assignee: issue.assignee().map(|a| JiraAssignee {
                        display_name: a.display_name.clone(),
                        email_address: a.email_address.clone().unwrap_or_default(),
                    }),
                    updated: updated * 1000, // Convert to milliseconds for JavaScript Date
                    created: created * 1000, // Convert to milliseconds for JavaScript Date
                },
            }
        })
        .collect();

    Ok(JiraSearchResponse {
        issues,
        total: results.total,
        is_last: results.is_last_page.unwrap_or(false),
    })
}

#[tauri::command]
#[specta::specta]
pub fn jira_add_worklog(
    url: String,
    username: String,
    password: String,
    issue_key: String,
    payload: WorklogPayload,
) -> Result<WorklogResponse, String> {
    log::info!(target: "jira", "Adding worklog to {}", issue_key);

    // Create Jira client via gouqi (consistent with other commands)
    let credentials = Credentials::Basic(username, password);
    let jira = Jira::new(&url, credentials)
        .map_err(|e| format!("Failed to create JIRA client: {}", e))?;

    // Build WorklogInput with precise started timestamp
    let mut started_str = payload.started.clone();
    // Convert "+HHMM"/"-HHMM" to RFC3339 "+HH:MM" for robust parsing
    if let Some(sign_idx) = started_str.rfind(|c| c == '+' || c == '-') {
        if started_str.len() >= sign_idx + 5 {
            // Insert ':' if not already present
            if started_str.chars().nth(sign_idx + 3) != Some(':') {
                started_str.insert(sign_idx + 3, ':');
            }
        }
    }

    let started: OffsetDateTime = OffsetDateTime::parse(&started_str, &Rfc3339)
        .map_err(|e| format!("Invalid 'started' timestamp: {}", e))?;

    let worklog = WorklogInput::new(payload.time_spent_seconds as u64)
        .with_comment(payload.comment)
        .started_at(started);

    let created = jira
        .issues()
        .add_worklog(&issue_key, worklog)
        .map_err(|e| format!("Failed to add worklog: {}", e))?;

    Ok(WorklogResponse { id: created.id })
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
