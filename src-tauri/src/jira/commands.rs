use gouqi::{Credentials, Jira};
use serde_json::json;
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
    log::debug!(target: "jira", "Worklog payload - time_spent_seconds: {}, comment: '{}', started: '{}'", 
        payload.time_spent_seconds, payload.comment, payload.started);

    // Create Jira client via gouqi (for potential future use)
    let _credentials = Credentials::Basic(username.clone(), password.clone());
    let _jira = Jira::new(&url, _credentials)
        .map_err(|e| format!("Failed to create JIRA client: {}", e))?;

    // Build WorklogInput with precise started timestamp
    let mut started_str = payload.started.clone();
    // Convert "+HHMM"/"-HHMM" to RFC3339 "+HH:MM" for robust parsing
    if let Some(sign_idx) = started_str.rfind(['+', '-']) {
        if started_str.len() >= sign_idx + 5
            && started_str.chars().nth(sign_idx + 3) != Some(':')
        {
            started_str.insert(sign_idx + 3, ':');
        }
    }

    let started: OffsetDateTime = OffsetDateTime::parse(&started_str, &Rfc3339)
        .map_err(|e| format!("Invalid 'started' timestamp: {}", e))?;

    log::debug!(target: "jira", "Creating worklog - comment: '{}', time: {}s", payload.comment, payload.time_spent_seconds);
    
    // Format started time for JIRA Cloud API
    let time_format = time::format_description::parse(
        "[year]-[month]-[day]T[hour]:[minute]:[second].[subsecond digits:3][offset_hour sign:mandatory][offset_minute]"
    ).map_err(|e| format!("Failed to create time format: {}", e))?;
    let started_formatted = started.format(&time_format)
        .map_err(|e| format!("Failed to format started time: {}", e))?;

    // Create ADF (Atlassian Document Format) for comment
    // JIRA Cloud requires comments in ADF format
    let comment_adf = json!({
        "version": 1,
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": payload.comment
                    }
                ]
            }
        ]
    });

    // Build the worklog JSON payload for JIRA Cloud API
    let worklog_payload = json!({
        "timeSpentSeconds": payload.time_spent_seconds,
        "started": started_formatted,
        "comment": comment_adf
    });

    log::debug!(target: "jira", "Sending worklog to JIRA API with ADF comment");

    // Make direct HTTP request to JIRA Cloud API
    let client = reqwest::blocking::Client::new();
    let auth_string = format!("{}:{}", username, password);
    let auth_header = format!(
        "Basic {}",
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, auth_string.as_bytes())
    );
    
    let response = client
        .post(format!("{}/rest/api/3/issue/{}/worklog", url, issue_key))
        .header("Authorization", auth_header)
        .header("Content-Type", "application/json")
        .json(&worklog_payload)
        .send()
        .map_err(|e| format!("Failed to send request to JIRA: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("JIRA API error {}: {}", status, error_text));
    }

    let created: serde_json::Value = response.json()
        .map_err(|e| format!("Failed to parse JIRA response: {}", e))?;
    
    let worklog_id = created["id"].as_str()
        .ok_or_else(|| "No worklog ID in response".to_string())?
        .to_string();
    
    log::debug!(target: "jira", "Worklog created successfully with ID: {}", worklog_id);

    Ok(WorklogResponse { id: worklog_id })
}

#[tauri::command]
#[specta::specta]
pub fn jira_update_worklog(
    url: String,
    username: String,
    password: String,
    issue_key: String,
    worklog_id: String,
    payload: WorklogPayload,
) -> Result<WorklogResponse, String> {
    log::info!(target: "jira", "Updating worklog {} for {}", worklog_id, issue_key);
    
    // Parse and format started time
    let mut started_str = payload.started.clone();
    if let Some(sign_idx) = started_str.rfind(['+', '-']) {
        if started_str.len() >= sign_idx + 5
            && started_str.chars().nth(sign_idx + 3) != Some(':')
        {
            started_str.insert(sign_idx + 3, ':');
        }
    }

    let started: OffsetDateTime = OffsetDateTime::parse(&started_str, &Rfc3339)
        .map_err(|e| format!("Invalid 'started' timestamp: {}", e))?;
    
    let time_format = time::format_description::parse(
        "[year]-[month]-[day]T[hour]:[minute]:[second].[subsecond digits:3][offset_hour sign:mandatory][offset_minute]"
    ).map_err(|e| format!("Failed to create time format: {}", e))?;
    let started_formatted = started.format(&time_format)
        .map_err(|e| format!("Failed to format started time: {}", e))?;

    // Create ADF comment
    let comment_adf = json!({
        "version": 1,
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [
                    {
                        "type": "text",
                        "text": payload.comment
                    }
                ]
            }
        ]
    });

    let worklog_payload = json!({
        "timeSpentSeconds": payload.time_spent_seconds,
        "started": started_formatted,
        "comment": comment_adf
    });

    let client = reqwest::blocking::Client::new();
    let auth_string = format!("{}:{}", username, password);
    let auth_header = format!(
        "Basic {}",
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, auth_string.as_bytes())
    );
    
    let response = client
        .put(format!("{}/rest/api/3/issue/{}/worklog/{}", url, issue_key, worklog_id))
        .header("Authorization", auth_header)
        .header("Content-Type", "application/json")
        .json(&worklog_payload)
        .send()
        .map_err(|e| format!("Failed to send request to JIRA: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("JIRA API error {}: {}", status, error_text));
    }

    log::debug!(target: "jira", "Worklog {} updated successfully", worklog_id);
    Ok(WorklogResponse { id: worklog_id })
}

#[tauri::command]
#[specta::specta]
pub fn jira_delete_worklog(
    url: String,
    username: String,
    password: String,
    issue_key: String,
    worklog_id: String,
) -> Result<(), String> {
    log::info!(target: "jira", "Deleting worklog {} from {}", worklog_id, issue_key);

    let client = reqwest::blocking::Client::new();
    let auth_string = format!("{}:{}", username, password);
    let auth_header = format!(
        "Basic {}",
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, auth_string.as_bytes())
    );
    
    let response = client
        .delete(format!("{}/rest/api/3/issue/{}/worklog/{}", url, issue_key, worklog_id))
        .header("Authorization", auth_header)
        .send()
        .map_err(|e| format!("Failed to send request to JIRA: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("JIRA API error {}: {}", status, error_text));
    }

    log::debug!(target: "jira", "Worklog {} deleted successfully", worklog_id);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn jira_get_worklogs(
    url: String,
    username: String,
    password: String,
    issue_key: String,
) -> Result<JiraWorklogListResponse, String> {
    log::info!(target: "jira", "Getting worklogs for issue: {}", issue_key);

    let credentials = Credentials::Basic(username, password);
    let jira = Jira::new(&url, credentials).map_err(|e| format!("Failed to create JIRA client: {}", e))?;

    let results = jira
        .issues()
        .get_worklogs(&issue_key)
        .map_err(|e| format!("Failed to get worklogs: {}", e))?;

    let worklogs = results
        .worklogs
        .iter()
        .map(|w| {
            log::debug!(target: "jira", "Processing worklog {}: comment = {:?}", w.id, w.comment);
            
            let author = w.author.as_ref().map(|a| JiraWorklogAuthor {
                display_name: a.display_name.clone(),
                email_address: a.email_address.clone(),
                avatar_urls: a.avatar_urls.as_ref().map(|urls| {
                    urls.iter().map(|(k, v)| (k.clone(), v.clone())).collect()
                }),
            });

            let update_author = w.update_author.as_ref().map(|ua| JiraWorklogAuthor {
                display_name: ua.display_name.clone(),
                email_address: ua.email_address.clone(),
                avatar_urls: ua.avatar_urls.as_ref().map(|urls| {
                    urls.iter().map(|(k, v)| (k.clone(), v.clone())).collect()
                }),
            });
            
            let comment_text = w.comment.as_ref().map(|c| {
                let text = c.to_string();
                log::debug!(target: "jira", "Worklog {} comment text: '{}'", w.id, text);
                text
            });

            JiraWorklog {
                id: w.id.clone(),
                author,
                update_author,
                comment: comment_text,
                created: w.created.as_ref().map(|dt| dt.format(&Rfc3339).unwrap_or_default()).unwrap_or_default(),
                updated: w.updated.as_ref().map(|dt| dt.format(&Rfc3339).unwrap_or_default()).unwrap_or_default(),
                started: w.started.as_ref().map(|dt| dt.format(&Rfc3339).unwrap_or_default()).unwrap_or_default(),
                time_spent: w.time_spent.clone().unwrap_or_default(),
                time_spent_seconds: w.time_spent_seconds.unwrap_or(0),
            }
        })
        .collect();

    Ok(JiraWorklogListResponse {
        worklogs,
        total: results.total,
        max_results: results.max_results,
        start_at: results.start_at,
    })
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
