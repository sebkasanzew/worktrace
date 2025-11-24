use serde_json::json;
use time::format_description::{self, well_known::Rfc3339};
use time::OffsetDateTime;

use super::types::*;
use super::requests::create_client_request;

#[tauri::command]
#[specta::specta]
pub fn jira_api_request(
    url: String,
    username: String,
    password: String,
    jql: String,
    api_version: Option<String>,
    auth_type: Option<String>,
) -> Result<JiraSearchResponse, String> {
    log::info!(target: "jira", "Making JIRA API request");
    
    let version = api_version.unwrap_or_else(|| "3".to_string());
    let auth = auth_type.unwrap_or_else(|| "Basic".to_string());

    // JIRA Cloud (v3) removed the 'search' endpoint in favor of 'search/jql'
    // JIRA Server/DC (v2) still uses 'search'
    let path = if version == "3" { "search/jql" } else { "search" };

    let client = reqwest::blocking::Client::new();
    
    let response = create_client_request(
        &client, 
        reqwest::Method::POST, 
        &url, 
        &version, 
        path, 
        &username, 
        &password, 
        &auth
    )
    .json(&json!({
        "jql": jql,
        "fields": ["summary", "status", "assignee", "updated", "created", "key", "subtasks", "issuetype"],
        "maxResults": 50
    }))
    .send()
    .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().unwrap_or_default();
        return Err(format!("JIRA API error {}: {}", status, text));
    }

    let results: serde_json::Value = response.json()
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    // JIRA date format: 2021-01-17T12:34:00.000+0000 (no colon in offset)
    let jira_format = format_description::parse(
        "[year]-[month]-[day]T[hour]:[minute]:[second].[subsecond][offset_hour sign:mandatory][offset_minute]"
    ).unwrap_or_default();

    let issues: Vec<JiraIssue> = results["issues"]
        .as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|issue| {
            let fields = &issue["fields"];
            
            let parse_date = |s: Option<&str>| -> i64 {
                s.and_then(|date_str| {
                    // Try RFC3339 first (standard)
                    if let Ok(dt) = OffsetDateTime::parse(date_str, &Rfc3339) {
                        return Some(dt);
                    }
                    // Try JIRA format
                    OffsetDateTime::parse(date_str, &jira_format).ok()
                })
                .map(|dt| dt.unix_timestamp() * 1000)
                .unwrap_or(0)
            };

            let updated = parse_date(fields["updated"].as_str());
            let created = parse_date(fields["created"].as_str());

            let subtasks = fields["subtasks"]
                .as_array()
                .unwrap_or(&vec![])
                .iter()
                .map(|val| {
                    let id = val["id"].as_str().unwrap_or_default().to_string();
                    let key = val["key"].as_str().unwrap_or_default().to_string();
                    let summary = val["fields"]["summary"].as_str().unwrap_or_default().to_string();
                    let status_name = val["fields"]["status"]["name"].as_str().unwrap_or_default().to_string();
                    
                    let status_category = val["fields"]["status"]["statusCategory"].as_object().map(|sc| {
                        JiraStatusCategory {
                            key: sc["key"].as_str().unwrap_or_default().to_string(),
                            name: sc["name"].as_str().unwrap_or_default().to_string(),
                        }
                    });

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
                })
                .collect();

            let status_category = fields["status"]["statusCategory"].as_object().map(|sc| {
                JiraStatusCategory {
                    key: sc["key"].as_str().unwrap_or_default().to_string(),
                    name: sc["name"].as_str().unwrap_or_default().to_string(),
                }
            });

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
        })
        .collect();

    // Handle response differences between v2 (Server/DC) and v3 (Cloud)
    let (total, is_last) = if version == "3" {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jira_api_request_empty_jql() {
        let result = jira_api_request(
            "https://test.atlassian.net".to_string(),
            "test@example.com".to_string(),
            "test-token".to_string(),
            "".to_string(),
            None,
            None,
        );

        // Should handle empty JQL gracefully
        assert!(result.is_err());
    }
}
