use serde_json::json;
use time::format_description::well_known::Rfc3339;
use time::{format_description, Date, OffsetDateTime};

use super::types::*;
use super::requests::{create_client_request, RequestConfig};

#[tauri::command]
#[specta::specta]
pub fn jira_add_worklog(
    connection: JiraConnection,
    issue_key: String,
    payload: WorklogPayload,
) -> Result<WorklogResponse, String> {
    log::info!(target: "jira", "Adding worklog to {}", issue_key);
    
    let config = RequestConfig::from(&connection);

    let mut started_str = payload.started.clone();
    if let Some(sign_idx) = started_str.rfind(['+', '-'])
        && started_str.len() >= sign_idx + 5
        && started_str.chars().nth(sign_idx + 3) != Some(':')
    {
        started_str.insert(sign_idx + 3, ':');
    }

    let started: OffsetDateTime = OffsetDateTime::parse(&started_str, &Rfc3339)
        .map_err(|e| format!("Invalid 'started' timestamp: {}", e))?;

    let time_format = time::format_description::parse(
        "[year]-[month]-[day]T[hour]:[minute]:[second].[subsecond digits:3][offset_hour sign:mandatory][offset_minute]"
    ).map_err(|e| format!("Failed to create time format: {}", e))?;
    let started_formatted = started.format(&time_format)
        .map_err(|e| format!("Failed to format started time: {}", e))?;

    let worklog_payload = if config.api_version == "2" {
        json!({
            "timeSpentSeconds": payload.time_spent_seconds,
            "started": started_formatted,
            "comment": payload.comment
        })
    } else {
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

        json!({
            "timeSpentSeconds": payload.time_spent_seconds,
            "started": started_formatted,
            "comment": comment_adf
        })
    };

    let client = reqwest::blocking::Client::new();
    let path = format!("issue/{}/worklog", issue_key);
    
    let response = create_client_request(&client, reqwest::Method::POST, &config, &path)
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
    connection: JiraConnection,
    issue_key: String,
    worklog_id: String,
    payload: WorklogPayload,
) -> Result<WorklogResponse, String> {
    log::info!(target: "jira", "Updating worklog {} for {}", worklog_id, issue_key);
    
    let config = RequestConfig::from(&connection);

    let mut started_str = payload.started.clone();
    if let Some(sign_idx) = started_str.rfind(['+', '-'])
        && started_str.len() >= sign_idx + 5
        && started_str.chars().nth(sign_idx + 3) != Some(':')
    {
        started_str.insert(sign_idx + 3, ':');
    }

    let started: OffsetDateTime = OffsetDateTime::parse(&started_str, &Rfc3339)
        .map_err(|e| format!("Invalid 'started' timestamp: {}", e))?;
    
    let time_format = time::format_description::parse(
        "[year]-[month]-[day]T[hour]:[minute]:[second].[subsecond digits:3][offset_hour sign:mandatory][offset_minute]"
    ).map_err(|e| format!("Failed to create time format: {}", e))?;
    let started_formatted = started.format(&time_format)
        .map_err(|e| format!("Failed to format started time: {}", e))?;

    let worklog_payload = if config.api_version == "2" {
        json!({
            "timeSpentSeconds": payload.time_spent_seconds,
            "started": started_formatted,
            "comment": payload.comment
        })
    } else {
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

        json!({
            "timeSpentSeconds": payload.time_spent_seconds,
            "started": started_formatted,
            "comment": comment_adf
        })
    };

    let client = reqwest::blocking::Client::new();
    let path = format!("issue/{}/worklog/{}", issue_key, worklog_id);

    let response = create_client_request(&client, reqwest::Method::PUT, &config, &path)
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
    connection: JiraConnection,
    issue_key: String,
    worklog_id: String,
) -> Result<(), String> {
    log::info!(target: "jira", "Deleting worklog {} from {}", worklog_id, issue_key);

    let config = RequestConfig::from(&connection);

    let client = reqwest::blocking::Client::new();
    let path = format!("issue/{}/worklog/{}", issue_key, worklog_id);

    let response = create_client_request(&client, reqwest::Method::DELETE, &config, &path)
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
    connection: JiraConnection,
    issue_key: String,
) -> Result<JiraWorklogListResponse, String> {
    log::info!(target: "jira", "Getting worklogs for issue: {}", issue_key);

    let config = RequestConfig::from(&connection);

    let client = reqwest::blocking::Client::new();
    let path = format!("issue/{}/worklog", issue_key);

    let response = create_client_request(&client, reqwest::Method::GET, &config, &path)
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

/// Parse worklog from JSON (shared helper)
fn parse_worklog(w: &serde_json::Value) -> JiraWorklog {
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
}

/// Get all worklogs for the current user within a date range
/// Uses JQL to find issues with worklogs in the date range, then fetches and filters worklogs
#[tauri::command]
#[specta::specta]
pub fn jira_get_user_worklogs_by_date_range(
    connection: JiraConnection,
    start_date: String,
    end_date: String,
) -> Result<UserWorklogsResponse, String> {
    log::info!(target: "jira", "Getting user worklogs from {} to {}", start_date, end_date);

    let config = RequestConfig::from(&connection);

    // Parse dates to validate format (YYYY-MM-DD)
    let date_format = format_description::parse("[year]-[month]-[day]")
        .map_err(|e| format!("Failed to create date format: {}", e))?;
    let start = Date::parse(&start_date, &date_format)
        .map_err(|e| format!("Invalid start_date format (expected YYYY-MM-DD): {}", e))?;
    let end = Date::parse(&end_date, &date_format)
        .map_err(|e| format!("Invalid end_date format (expected YYYY-MM-DD): {}", e))?;

    if start > end {
        return Err("start_date must be before or equal to end_date".to_string());
    }

    let client = reqwest::blocking::Client::new();

    // Step 1: Find issues with worklogs in the date range using JQL
    let jql = format!(
        "worklogDate >= {} AND worklogDate <= {} AND worklogAuthor = currentUser()",
        start_date, end_date
    );
    
    let path = if config.api_version == "3" { "search/jql" } else { "search" };
    
    let search_response = create_client_request(&client, reqwest::Method::POST, &config, path)
        .json(&json!({
            "jql": jql,
            "fields": ["summary", "key"],
            "maxResults": 100
        }))
        .send()
        .map_err(|e| format!("Failed to search issues: {}", e))?;

    if !search_response.status().is_success() {
        let status = search_response.status();
        let error_text = search_response.text().unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("JIRA search error {}: {}", status, error_text));
    }

    let search_results: serde_json::Value = search_response.json()
        .map_err(|e| format!("Failed to parse search response: {}", e))?;

    let issues = search_results["issues"].as_array()
        .ok_or_else(|| "No issues array in response".to_string())?;

    log::debug!(target: "jira", "Found {} issues with worklogs in date range", issues.len());

    // Step 2: For each issue, fetch worklogs and filter by author and date
    let mut entries: Vec<UserWorklogEntry> = Vec::new();
    let mut total_time_seconds: u64 = 0;

    // JIRA date format for parsing worklog 'started' field
    let jira_format = format_description::parse(
        "[year]-[month]-[day]T[hour]:[minute]:[second].[subsecond][offset_hour sign:mandatory][offset_minute]"
    ).unwrap_or_default();

    for issue in issues {
        let issue_key = issue["key"].as_str().unwrap_or_default().to_string();
        let issue_summary = issue["fields"]["summary"].as_str().unwrap_or_default().to_string();

        if issue_key.is_empty() {
            continue;
        }

        let worklog_path = format!("issue/{}/worklog", issue_key);
        
        let worklog_response = create_client_request(
            &client, 
            reqwest::Method::GET, 
            &config, 
            &worklog_path
        )
        .send();

        let worklog_response = match worklog_response {
            Ok(r) => r,
            Err(e) => {
                log::warn!(target: "jira", "Failed to fetch worklogs for {}: {}", issue_key, e);
                continue;
            }
        };

        if !worklog_response.status().is_success() {
            log::warn!(target: "jira", "Failed to fetch worklogs for {}: {}", issue_key, worklog_response.status());
            continue;
        }

        let worklog_results: serde_json::Value = match worklog_response.json() {
            Ok(r) => r,
            Err(e) => {
                log::warn!(target: "jira", "Failed to parse worklogs for {}: {}", issue_key, e);
                continue;
            }
        };

        let empty_vec = vec![];
        let worklogs = worklog_results["worklogs"].as_array()
            .unwrap_or(&empty_vec);

        for w in worklogs {
            // Check if worklog author matches (by email or displayName)
            let author_email = w["author"]["emailAddress"].as_str().unwrap_or_default();
            let is_author = author_email.eq_ignore_ascii_case(config.username);

            if !is_author {
                continue;
            }

            // Check if worklog started date is within range
            let started_str = w["started"].as_str().unwrap_or_default();
            let started_date = OffsetDateTime::parse(started_str, &Rfc3339)
                .or_else(|_| OffsetDateTime::parse(started_str, &jira_format))
                .map(|dt| dt.date())
                .ok();

            if let Some(worklog_date) = started_date
                && worklog_date >= start
                && worklog_date <= end
            {
                let worklog = parse_worklog(w);
                total_time_seconds += worklog.time_spent_seconds;

                entries.push(UserWorklogEntry {
                    issue_key: issue_key.clone(),
                    issue_summary: issue_summary.clone(),
                    worklog,
                });
            }
        }
    }

    // Sort entries by started date (most recent first)
    entries.sort_by(|a, b| b.worklog.started.cmp(&a.worklog.started));

    log::info!(target: "jira", "Found {} worklog entries totaling {} seconds", entries.len(), total_time_seconds);

    Ok(UserWorklogsResponse {
        entries,
        start_date,
        end_date,
        total_time_seconds,
    })
}
