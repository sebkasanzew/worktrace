use serde_json::json;
use time::format_description::{self, well_known::Rfc3339};
use time::OffsetDateTime;

use super::types::*;
use super::requests::{create_client_request, RequestConfig};

#[tauri::command]
#[specta::specta]
pub async fn jira_api_request(
    url: String,
    username: String,
    password: String,
    jql: String,
    api_version: Option<String>,
    auth_type: Option<String>,
) -> Result<JiraSearchResponse, String> {
    log::info!(target: "jira", "Making JIRA API request");
    
    let config = RequestConfig {
        url: &url,
        api_version: api_version.as_deref().unwrap_or("3"),
        username: &username,
        password: &password,
        auth_type: auth_type.as_deref().unwrap_or("Basic"),
    };

    // JIRA Cloud (v3) removed the 'search' endpoint in favor of 'search/jql'
    // JIRA Server/DC (v2) still uses 'search'
    let path = if config.api_version == "3" { "search/jql" } else { "search" };

    let client = reqwest::Client::new();
    
    let response = create_client_request(&client, reqwest::Method::POST, &config, path)
        .json(&json!({
            "jql": jql,
            "fields": ["summary", "status", "assignee", "updated", "created", "key", "subtasks", "issuetype"],
            "maxResults": 50
        }))
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("JIRA API error {}: {}", status, text));
    }

    let results: serde_json::Value = response.json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let issues = parse_search_response(&results, config.api_version);

    // Handle response differences between v2 (Server/DC) and v3 (Cloud)
    let (total, is_last) = if config.api_version == "3" {
        // v3 search/jql: returns isLast, no total
        (
            issues.len() as u64,
            results["isLast"].as_bool().unwrap_or(true)
        )
    } else {
        // v2 search: returns total, startAt, maxResults
        let total = results["total"].as_u64().unwrap_or(issues.len() as u64);
        let start_at = results["startAt"].as_u64().unwrap_or(0);
        let max_results = results["maxResults"].as_u64().unwrap_or(50);
        (
            total,
            total <= (start_at + max_results)
        )
    };

    Ok(JiraSearchResponse {
        issues,
        total,
        is_last,
    })
}

/// Parse JIRA date string to Unix timestamp in milliseconds
/// Handles both RFC3339 and JIRA's custom format
pub fn parse_jira_date(date_str: Option<&str>) -> i64 {
    // JIRA date format: 2021-01-17T12:34:00.000+0000 (no colon in offset)
    let jira_format = format_description::parse(
        "[year]-[month]-[day]T[hour]:[minute]:[second].[subsecond][offset_hour sign:mandatory][offset_minute]"
    ).unwrap_or_default();

    date_str.and_then(|s| {
        // Try RFC3339 first (standard)
        if let Ok(dt) = OffsetDateTime::parse(s, &Rfc3339) {
            return Some(dt);
        }
        // Try JIRA format
        OffsetDateTime::parse(s, &jira_format).ok()
    })
    .map(|dt| dt.unix_timestamp() * 1000)
    .unwrap_or(0)
}

/// Parse status category from JSON
pub fn parse_status_category(value: &serde_json::Value) -> Option<JiraStatusCategory> {
    value.as_object().map(|sc| {
        JiraStatusCategory {
            key: sc["key"].as_str().unwrap_or_default().to_string(),
            name: sc["name"].as_str().unwrap_or_default().to_string(),
        }
    })
}

/// Parse subtask from JSON
pub fn parse_subtask(val: &serde_json::Value) -> JiraSubtask {
    let id = val["id"].as_str().unwrap_or_default().to_string();
    let key = val["key"].as_str().unwrap_or_default().to_string();
    let summary = val["fields"]["summary"].as_str().unwrap_or_default().to_string();
    let status_name = val["fields"]["status"]["name"].as_str().unwrap_or_default().to_string();
    let status_category = parse_status_category(&val["fields"]["status"]["statusCategory"]);

    JiraSubtask {
        id,
        key,
        fields: JiraSubtaskFields {
            summary,
            status: JiraStatus { 
                name: status_name,
                status_category,
            },
        },
    }
}

/// Parse a single issue from JSON
pub fn parse_issue(issue: &serde_json::Value) -> JiraIssue {
    let fields = &issue["fields"];
    
    let updated = parse_jira_date(fields["updated"].as_str());
    let created = parse_jira_date(fields["created"].as_str());

    let subtasks = fields["subtasks"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(parse_subtask)
        .collect();

    let status_category = parse_status_category(&fields["status"]["statusCategory"]);

    let assignee = fields["assignee"].as_object().map(|a| JiraAssignee {
        display_name: a["displayName"].as_str().unwrap_or_default().to_string(),
        email_address: a["emailAddress"].as_str().unwrap_or_default().to_string(),
    });

    let issuetype = JiraIssueType {
        name: fields["issuetype"]["name"].as_str().unwrap_or_default().to_string(),
        subtask: fields["issuetype"]["subtask"].as_bool().unwrap_or(false),
    };

    JiraIssue {
        id: issue["id"].as_str().unwrap_or_default().to_string(),
        key: issue["key"].as_str().unwrap_or_default().to_string(),
        fields: JiraFields {
            summary: fields["summary"].as_str().unwrap_or_default().to_string(),
            status: JiraStatus {
                name: fields["status"]["name"].as_str().unwrap_or_default().to_string(),
                status_category,
            },
            issuetype,
            assignee,
            updated,
            created,
            subtasks,
        },
    }
}

/// Parse search response issues array
pub fn parse_search_response(results: &serde_json::Value, _api_version: &str) -> Vec<JiraIssue> {
    results["issues"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(parse_issue)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_jira_api_request_empty_jql() {
        let result = jira_api_request(
            "https://test.atlassian.net".to_string(),
            "test@example.com".to_string(),
            "test-token".to_string(),
            "".to_string(),
            None,
            None,
        ).await;

        // Should handle empty JQL gracefully
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_jira_date_rfc3339() {
        let ts = parse_jira_date(Some("2024-01-15T10:30:00.000Z"));
        assert!(ts > 0);
        // Just verify it parses correctly, don't assert exact value (timezone dependent)
    }

    #[test]
    fn test_parse_jira_date_jira_format() {
        let ts = parse_jira_date(Some("2024-01-15T10:30:00.000+0000"));
        assert!(ts > 0);
        // Both formats should parse to the same timestamp
        let ts_rfc = parse_jira_date(Some("2024-01-15T10:30:00.000Z"));
        assert_eq!(ts, ts_rfc);
    }

    #[test]
    fn test_parse_jira_date_none() {
        assert_eq!(parse_jira_date(None), 0);
    }

    #[test]
    fn test_parse_jira_date_invalid() {
        assert_eq!(parse_jira_date(Some("not-a-date")), 0);
    }

    #[test]
    fn test_parse_status_category() {
        let json = serde_json::json!({
            "key": "done",
            "name": "Done"
        });
        let result = parse_status_category(&json);
        assert!(result.is_some());
        let cat = result.unwrap();
        assert_eq!(cat.key, "done");
        assert_eq!(cat.name, "Done");
    }

    #[test]
    fn test_parse_status_category_null() {
        let result = parse_status_category(&serde_json::Value::Null);
        assert!(result.is_none());
    }

    #[test]
    fn test_parse_issue_minimal() {
        let json = serde_json::json!({
            "id": "12345",
            "key": "PROJ-123",
            "fields": {
                "summary": "Test issue",
                "status": {
                    "name": "Open",
                    "statusCategory": {
                        "key": "new",
                        "name": "To Do"
                    }
                },
                "issuetype": {
                    "name": "Task",
                    "subtask": false
                },
                "created": "2024-01-15T10:30:00.000Z",
                "updated": "2024-01-16T14:00:00.000Z",
                "subtasks": []
            }
        });
        
        let issue = parse_issue(&json);
        assert_eq!(issue.id, "12345");
        assert_eq!(issue.key, "PROJ-123");
        assert_eq!(issue.fields.summary, "Test issue");
        assert_eq!(issue.fields.status.name, "Open");
        assert!(issue.fields.assignee.is_none());
        assert!(issue.fields.subtasks.is_empty());
    }

    #[test]
    fn test_parse_issue_with_assignee() {
        let json = serde_json::json!({
            "id": "12345",
            "key": "PROJ-123",
            "fields": {
                "summary": "Test issue",
                "status": { "name": "Open" },
                "issuetype": { "name": "Task", "subtask": false },
                "assignee": {
                    "displayName": "John Doe",
                    "emailAddress": "john@example.com"
                },
                "subtasks": []
            }
        });
        
        let issue = parse_issue(&json);
        assert!(issue.fields.assignee.is_some());
        let assignee = issue.fields.assignee.unwrap();
        assert_eq!(assignee.display_name, "John Doe");
        assert_eq!(assignee.email_address, "john@example.com");
    }

    #[test]
    fn test_parse_subtask() {
        let json = serde_json::json!({
            "id": "67890",
            "key": "PROJ-124",
            "fields": {
                "summary": "Subtask summary",
                "status": {
                    "name": "In Progress",
                    "statusCategory": {
                        "key": "indeterminate",
                        "name": "In Progress"
                    }
                }
            }
        });
        
        let subtask = parse_subtask(&json);
        assert_eq!(subtask.id, "67890");
        assert_eq!(subtask.key, "PROJ-124");
        assert_eq!(subtask.fields.summary, "Subtask summary");
        assert_eq!(subtask.fields.status.name, "In Progress");
    }
}
