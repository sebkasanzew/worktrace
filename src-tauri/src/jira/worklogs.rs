use serde_json::json;
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

use super::types::*;
use super::requests::create_client_request;

#[tauri::command]
#[specta::specta]
pub fn jira_add_worklog(
    url: String,
    username: String,
    password: String,
    issue_key: String,
    payload: WorklogPayload,
    api_version: Option<String>,
    auth_type: Option<String>,
) -> Result<WorklogResponse, String> {
    log::info!(target: "jira", "Adding worklog to {}", issue_key);
    
    let version = api_version.unwrap_or_else(|| "3".to_string());
    let auth = auth_type.unwrap_or_else(|| "Basic".to_string());

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
    let path = format!("issue/{}/worklog", issue_key);
    
    let response = create_client_request(
        &client, 
        reqwest::Method::POST, 
        &url, 
        &version, 
        &path, 
        &username, 
        &password, 
        &auth
    )
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
    api_version: Option<String>,
    auth_type: Option<String>,
) -> Result<WorklogResponse, String> {
    log::info!(target: "jira", "Updating worklog {} for {}", worklog_id, issue_key);
    
    let version = api_version.unwrap_or_else(|| "3".to_string());
    let auth = auth_type.unwrap_or_else(|| "Basic".to_string());

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
    let path = format!("issue/{}/worklog/{}", issue_key, worklog_id);

    let response = create_client_request(
        &client, 
        reqwest::Method::PUT, 
        &url, 
        &version, 
        &path, 
        &username, 
        &password, 
        &auth
    )
    .json(&worklog_payload)
    .send()
    .map_err(|e| format!("Failed to send request to JIRA: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("JIRA API error {}: {}", status, error_text));
    }

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
    api_version: Option<String>,
    auth_type: Option<String>,
) -> Result<(), String> {
    log::info!(target: "jira", "Deleting worklog {} from {}", worklog_id, issue_key);

    let version = api_version.unwrap_or_else(|| "3".to_string());
    let auth = auth_type.unwrap_or_else(|| "Basic".to_string());

    let client = reqwest::blocking::Client::new();
    let path = format!("issue/{}/worklog/{}", issue_key, worklog_id);

    let response = create_client_request(
        &client, 
        reqwest::Method::DELETE, 
        &url, 
        &version, 
        &path, 
        &username, 
        &password, 
        &auth
    )
    .send()
    .map_err(|e| format!("Failed to send request to JIRA: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("JIRA API error {}: {}", status, error_text));
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn jira_get_worklogs(
    url: String,
    username: String,
    password: String,
    issue_key: String,
    api_version: Option<String>,
    auth_type: Option<String>,
) -> Result<JiraWorklogListResponse, String> {
    log::info!(target: "jira", "Getting worklogs for issue: {}", issue_key);

    let version = api_version.unwrap_or_else(|| "3".to_string());
    let auth = auth_type.unwrap_or_else(|| "Basic".to_string());

    let client = reqwest::blocking::Client::new();
    let path = format!("issue/{}/worklog", issue_key);

    let response = create_client_request(
        &client, 
        reqwest::Method::GET, 
        &url, 
        &version, 
        &path, 
        &username, 
        &password, 
        &auth
    )
    .send()
    .map_err(|e| format!("Failed to send request to JIRA: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("JIRA API error {}: {}", status, error_text));
    }

    let results: serde_json::Value = response.json()
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let worklogs: Vec<JiraWorklog> = results["worklogs"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|w| {
            let author = w["author"].as_object().map(|a| JiraWorklogAuthor {
                display_name: a["displayName"].as_str().unwrap_or_default().to_string(),
                email_address: a["emailAddress"].as_str().map(|s| s.to_string()),
                avatar_urls: a["avatarUrls"].as_object().map(|urls| {
                    urls.iter().map(|(k, v)| (k.clone(), v.as_str().unwrap_or_default().to_string())).collect()
                }),
            });

            let update_author = w["updateAuthor"].as_object().map(|ua| JiraWorklogAuthor {
                display_name: ua["displayName"].as_str().unwrap_or_default().to_string(),
                email_address: ua["emailAddress"].as_str().map(|s| s.to_string()),
                avatar_urls: ua["avatarUrls"].as_object().map(|urls| {
                    urls.iter().map(|(k, v)| (k.clone(), v.as_str().unwrap_or_default().to_string())).collect()
                }),
            });
            
            // Handle comment which can be string (v2) or ADF (v3)
            let comment_text = if let Some(comment_str) = w["comment"].as_str() {
                Some(comment_str.to_string())
            } else if let Some(comment_obj) = w["comment"].as_object() {
                // Try to extract text from ADF if possible, or just dump JSON
                // For now, let's just try to get the text content if it's a simple paragraph
                // This is a simplification
                comment_obj.get("content")
                    .and_then(|c| c.as_array())
                    .and_then(|arr| arr.first())
                    .and_then(|p| p.get("content"))
                    .and_then(|c| c.as_array())
                    .and_then(|arr| arr.first())
                    .and_then(|t| t.get("text"))
                    .and_then(|t| t.as_str())
                    .map(|s| s.to_string())
            } else {
                None
            };

            JiraWorklog {
                id: w["id"].as_str().unwrap_or_default().to_string(),
                author,
                update_author,
                comment: comment_text,
                created: w["created"].as_str().unwrap_or_default().to_string(),
                updated: w["updated"].as_str().unwrap_or_default().to_string(),
                started: w["started"].as_str().unwrap_or_default().to_string(),
                time_spent: w["timeSpent"].as_str().unwrap_or_default().to_string(),
                time_spent_seconds: w["timeSpentSeconds"].as_u64().unwrap_or(0),
            }
        })
        .collect();

    Ok(JiraWorklogListResponse {
        worklogs,
        total: results["total"].as_u64().unwrap_or(0),
        max_results: results["maxResults"].as_u64().unwrap_or(0),
        start_at: results["startAt"].as_u64().unwrap_or(0),
    })
}
