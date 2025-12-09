use serde_json::json;
use time::format_description::well_known::Rfc3339;
use time::{format_description, Date, OffsetDateTime};

use super::types::*;
use super::requests::{create_client_request, RequestConfig};

#[tauri::command]
#[specta::specta]
pub async fn jira_add_worklog(
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

    let client = reqwest::Client::new();
    let path = format!("issue/{}/worklog", issue_key);
    
    let response = create_client_request(&client, reqwest::Method::POST, &config, &path)
        .json(&worklog_payload)
        .send()
        .await
        .map_err(|e| format!("Failed to send request to JIRA: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("JIRA API error {}: {}", status, error_text));
    }

    let created: serde_json::Value = response.json()
        .await
        .map_err(|e| format!("Failed to parse JIRA response: {}", e))?;
    
    let worklog_id = created["id"].as_str()
        .ok_or_else(|| "No worklog ID in response".to_string())?
        .to_string();
    
    Ok(WorklogResponse { id: worklog_id })
}

#[tauri::command]
#[specta::specta]
pub async fn jira_update_worklog(
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

    let client = reqwest::Client::new();
    let path = format!("issue/{}/worklog/{}", issue_key, worklog_id);

    let response = create_client_request(&client, reqwest::Method::PUT, &config, &path)
        .json(&worklog_payload)
        .send()
        .await
        .map_err(|e| format!("Failed to send request to JIRA: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("JIRA API error {}: {}", status, error_text));
    }

    Ok(WorklogResponse { id: worklog_id })
}

#[tauri::command]
#[specta::specta]
pub async fn jira_delete_worklog(
    connection: JiraConnection,
    issue_key: String,
    worklog_id: String,
) -> Result<(), String> {
    log::info!(target: "jira", "Deleting worklog {} from {}", worklog_id, issue_key);

    let config = RequestConfig::from(&connection);

    let client = reqwest::Client::new();
    let path = format!("issue/{}/worklog/{}", issue_key, worklog_id);

    let response = create_client_request(&client, reqwest::Method::DELETE, &config, &path)
        .send()
        .await
        .map_err(|e| format!("Failed to send request to JIRA: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("JIRA API error {}: {}", status, error_text));
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn jira_get_worklogs(
    connection: JiraConnection,
    issue_key: String,
) -> Result<JiraWorklogListResponse, String> {
    log::info!(target: "jira", "Getting worklogs for issue: {}", issue_key);

    let config = RequestConfig::from(&connection);

    let client = reqwest::Client::new();
    let path = format!("issue/{}/worklog", issue_key);

    let response = create_client_request(&client, reqwest::Method::GET, &config, &path)
        .send()
        .await
        .map_err(|e| format!("Failed to send request to JIRA: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("JIRA API error {}: {}", status, error_text));
    }

    let results: serde_json::Value = response.json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let empty_vec = vec![];
    let worklogs: Vec<JiraWorklog> = results.get("worklogs")
        .and_then(|v| v.as_array())
        .unwrap_or(&empty_vec)
        .iter()
        .map(parse_worklog)
        .collect();

    Ok(JiraWorklogListResponse {
        worklogs,
        total: results.get("total").and_then(|v| v.as_u64()).unwrap_or(0),
        max_results: results.get("maxResults").and_then(|v| v.as_u64()).unwrap_or(0),
        start_at: results.get("startAt").and_then(|v| v.as_u64()).unwrap_or(0),
    })
}

/// Helper to safely get a string from a JSON object
fn get_str<'a>(obj: &'a serde_json::Map<String, serde_json::Value>, key: &str) -> Option<&'a str> {
    obj.get(key).and_then(|v| v.as_str())
}

/// Helper to parse author from JSON object
pub fn parse_author(author_value: &serde_json::Value) -> Option<JiraWorklogAuthor> {
    let a = author_value.as_object()?;
    Some(JiraWorklogAuthor {
        display_name: get_str(a, "displayName").unwrap_or_default().to_string(),
        name: get_str(a, "name").map(|s| s.to_string()),
        email_address: get_str(a, "emailAddress").map(|s| s.to_string()),
        avatar_urls: a.get("avatarUrls").and_then(|v| v.as_object()).map(|urls| {
            urls.iter().map(|(k, v)| (k.clone(), v.as_str().unwrap_or_default().to_string())).collect()
        }),
    })
}

/// Parse worklog from JSON (shared helper)
pub fn parse_worklog(w: &serde_json::Value) -> JiraWorklog {
    let author = w.get("author").and_then(parse_author);
    let update_author = w.get("updateAuthor").and_then(parse_author);
    
    // Handle comment which can be string (v2) or ADF (v3)
    let comment_text = parse_worklog_comment(w.get("comment"));

    JiraWorklog {
        id: w.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
        author,
        update_author,
        comment: comment_text,
        created: w.get("created").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
        updated: w.get("updated").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
        started: w.get("started").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
        time_spent: w.get("timeSpent").and_then(|v| v.as_str()).unwrap_or_default().to_string(),
        time_spent_seconds: w.get("timeSpentSeconds").and_then(|v| v.as_u64()).unwrap_or(0),
    }
}

/// Parse worklog comment which can be string (v2) or ADF (v3)
pub fn parse_worklog_comment(comment: Option<&serde_json::Value>) -> Option<String> {
    comment.and_then(|c| {
        if let Some(comment_str) = c.as_str() {
            Some(comment_str.to_string())
        } else if let Some(comment_obj) = c.as_object() {
            comment_obj.get("content")
                .and_then(|content| content.as_array())
                .and_then(|arr| arr.first())
                .and_then(|p| p.get("content"))
                .and_then(|content| content.as_array())
                .and_then(|arr| arr.first())
                .and_then(|t| t.get("text"))
                .and_then(|t| t.as_str())
                .map(|s| s.to_string())
        } else {
            None
        }
    })
}

/// Get all worklogs for the current user within a date range
/// Uses JQL to find issues with worklogs in the date range, then fetches and filters worklogs
#[tauri::command]
#[specta::specta]
pub async fn jira_get_user_worklogs_by_date_range(
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

    let client = reqwest::Client::new();

    // Step 0: Fetch current user's accountId for reliable author matching
    let myself_response = create_client_request(&client, reqwest::Method::GET, &config, "myself")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch current user info: {}", e))?;

    if !myself_response.status().is_success() {
        let status = myself_response.status();
        let error_text = myself_response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("Failed to get current user: {} - {}", status, error_text));
    }

    let myself: serde_json::Value = myself_response.json()
        .await
        .map_err(|e| format!("Failed to parse current user response: {}", e))?;
    
    let current_account_id = myself["accountId"].as_str().unwrap_or_default().to_string();
    let current_email = myself["emailAddress"].as_str().unwrap_or_default().to_string();
    let current_name = myself["name"].as_str().unwrap_or_default().to_string();
    
    log::debug!(target: "jira", "Current user - accountId: '{}', email: '{}', name: '{}'", 
        current_account_id, current_email, current_name);

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
        .await
        .map_err(|e| format!("Failed to search issues: {}", e))?;

    if !search_response.status().is_success() {
        let status = search_response.status();
        let error_text = search_response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(format!("JIRA search error {}: {}", status, error_text));
    }

    let search_results: serde_json::Value = search_response.json()
        .await
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
        .send()
        .await;

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

        let worklog_results: serde_json::Value = match worklog_response.json().await {
            Ok(r) => r,
            Err(e) => {
                log::warn!(target: "jira", "Failed to parse worklogs for {}: {}", issue_key, e);
                continue;
            }
        };

        let empty_vec = vec![];
        let worklogs = worklog_results["worklogs"].as_array()
            .unwrap_or(&empty_vec);

        log::debug!(target: "jira", "Issue {} has {} worklogs to check", issue_key, worklogs.len());

        for w in worklogs {
            // Check if worklog author matches current user
            // Try matching by accountId first (most reliable for JIRA Cloud),
            // then fall back to email/name for JIRA Server/Data Center
            let author_account_id = w["author"]["accountId"].as_str().unwrap_or_default();
            let author_email = w["author"]["emailAddress"].as_str().unwrap_or_default();
            let author_name = w["author"]["name"].as_str().unwrap_or_default();
            
            let is_author = 
                // Match by accountId (JIRA Cloud)
                (!current_account_id.is_empty() && !author_account_id.is_empty() && author_account_id == current_account_id)
                // Match by email
                || (!current_email.is_empty() && !author_email.is_empty() && author_email.eq_ignore_ascii_case(&current_email))
                // Match by name/username (JIRA Server)
                || (!current_name.is_empty() && !author_name.is_empty() && author_name.eq_ignore_ascii_case(&current_name))
                // Fallback: match against config username
                || author_email.eq_ignore_ascii_case(config.username)
                || author_name.eq_ignore_ascii_case(config.username);

            if !is_author {
                log::trace!(target: "jira", "Skipping worklog - author mismatch. Current user: accountId='{}', email='{}', name='{}'. Worklog author: accountId='{}', email='{}', name='{}'", 
                    current_account_id, current_email, current_name, author_account_id, author_email, author_name);
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_worklog_comment_string_v2() {
        let comment = serde_json::json!("This is a plain text comment");
        assert_eq!(
            parse_worklog_comment(Some(&comment)),
            Some("This is a plain text comment".to_string())
        );
    }

    #[test]
    fn test_parse_worklog_comment_adf_v3() {
        let comment = serde_json::json!({
            "version": 1,
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "content": [
                        {
                            "type": "text",
                            "text": "This is an ADF comment"
                        }
                    ]
                }
            ]
        });
        assert_eq!(
            parse_worklog_comment(Some(&comment)),
            Some("This is an ADF comment".to_string())
        );
    }

    #[test]
    fn test_parse_worklog_comment_none() {
        assert_eq!(parse_worklog_comment(None), None);
    }

    #[test]
    fn test_parse_worklog_comment_empty_adf() {
        let comment = serde_json::json!({
            "version": 1,
            "type": "doc",
            "content": []
        });
        assert_eq!(parse_worklog_comment(Some(&comment)), None);
    }

    #[test]
    fn test_parse_author_full() {
        let author = serde_json::json!({
            "displayName": "John Doe",
            "name": "jdoe",
            "emailAddress": "john@example.com",
            "avatarUrls": {
                "48x48": "https://example.com/avatar.png"
            }
        });
        let result = parse_author(&author).unwrap();
        assert_eq!(result.display_name, "John Doe");
        assert_eq!(result.name, Some("jdoe".to_string()));
        assert_eq!(result.email_address, Some("john@example.com".to_string()));
        assert!(result.avatar_urls.is_some());
    }

    #[test]
    fn test_parse_author_minimal() {
        let author = serde_json::json!({
            "displayName": "Jane Doe"
        });
        let result = parse_author(&author).unwrap();
        assert_eq!(result.display_name, "Jane Doe");
        assert!(result.name.is_none());
        assert!(result.email_address.is_none());
    }

    #[test]
    fn test_parse_author_null() {
        assert!(parse_author(&serde_json::Value::Null).is_none());
    }

    #[test]
    fn test_parse_worklog_full() {
        let worklog = serde_json::json!({
            "id": "12345",
            "author": {
                "displayName": "John Doe",
                "emailAddress": "john@example.com"
            },
            "updateAuthor": {
                "displayName": "Jane Doe"
            },
            "comment": "Worked on feature",
            "created": "2024-01-15T10:00:00.000Z",
            "updated": "2024-01-15T10:00:00.000Z",
            "started": "2024-01-15T09:00:00.000Z",
            "timeSpent": "1h",
            "timeSpentSeconds": 3600
        });
        
        let result = parse_worklog(&worklog);
        assert_eq!(result.id, "12345");
        assert!(result.author.is_some());
        assert_eq!(result.author.unwrap().display_name, "John Doe");
        assert!(result.update_author.is_some());
        assert_eq!(result.comment, Some("Worked on feature".to_string()));
        assert_eq!(result.time_spent, "1h");
        assert_eq!(result.time_spent_seconds, 3600);
    }

    #[test]
    fn test_parse_worklog_minimal() {
        let worklog = serde_json::json!({
            "id": "67890",
            "timeSpentSeconds": 1800
        });
        
        let result = parse_worklog(&worklog);
        assert_eq!(result.id, "67890");
        assert!(result.author.is_none());
        assert!(result.comment.is_none());
        assert_eq!(result.time_spent_seconds, 1800);
    }
}
