//! Integration tests for JIRA API using wiremock to mock HTTP responses
//!
//! These tests verify the full request/response flow without hitting real JIRA servers.

use wiremock::{MockServer, Mock, ResponseTemplate};
use wiremock::matchers::{method, path, header};
use serde_json::json;

/// Helper to create a mock JIRA server with common setup
async fn setup_mock_server() -> MockServer {
    MockServer::start().await
}

mod auth_tests {
    use super::*;
    use worktrace_lib::jira::auth::jira_get_current_user;

    #[tokio::test]
    async fn test_auth_success_v3() {
        let mock_server = setup_mock_server().await;
        
        Mock::given(method("GET"))
            .and(path("/rest/api/3/myself"))
            .and(header("Accept", "application/json"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "accountId": "5b10ac8d82e05b22cc7d4ef5",
                "displayName": "John Doe",
                "emailAddress": "john@example.com"
            })))
            .mount(&mock_server)
            .await;

        let result = jira_get_current_user(
            mock_server.uri(),
            "test@example.com".to_string(),
            "api-token".to_string(),
        ).await;

        assert!(result.is_ok());
        let session = result.unwrap();
        assert_eq!(session.name, "John Doe");
        assert_eq!(session.api_version, "3");
        assert_eq!(session.auth_type, "Basic");
    }

    #[tokio::test]
    async fn test_auth_fallback_to_v2() {
        let mock_server = setup_mock_server().await;
        
        // v3 fails
        Mock::given(method("GET"))
            .and(path("/rest/api/3/myself"))
            .respond_with(ResponseTemplate::new(404))
            .mount(&mock_server)
            .await;
        
        // v2 succeeds
        Mock::given(method("GET"))
            .and(path("/rest/api/2/myself"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "name": "jdoe",
                "displayName": "John Doe"
            })))
            .mount(&mock_server)
            .await;

        let result = jira_get_current_user(
            mock_server.uri(),
            "jdoe".to_string(),
            "password".to_string(),
        ).await;

        assert!(result.is_ok());
        let session = result.unwrap();
        assert_eq!(session.name, "John Doe");
        assert_eq!(session.api_version, "2");
    }

    #[tokio::test]
    async fn test_auth_empty_password_rejected() {
        let result = jira_get_current_user(
            "https://example.atlassian.net".to_string(),
            "test@example.com".to_string(),
            "".to_string(),
        ).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("API token is empty"));
    }

    #[tokio::test]
    async fn test_auth_all_strategies_fail() {
        let mock_server = setup_mock_server().await;
        
        // All endpoints return 401
        Mock::given(method("GET"))
            .and(path("/rest/api/3/myself"))
            .respond_with(ResponseTemplate::new(401).set_body_json(json!({
                "errorMessages": ["Unauthorized"]
            })))
            .mount(&mock_server)
            .await;

        Mock::given(method("GET"))
            .and(path("/rest/api/2/myself"))
            .respond_with(ResponseTemplate::new(401).set_body_json(json!({
                "errorMessages": ["Unauthorized"]
            })))
            .mount(&mock_server)
            .await;

        let result = jira_get_current_user(
            mock_server.uri(),
            "test@example.com".to_string(),
            "wrong-token".to_string(),
        ).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Authentication failed"));
    }
}

mod search_tests {
    use super::*;
    use worktrace_lib::jira::issues::jira_api_request;

    #[tokio::test]
    async fn test_search_success_v3() {
        let mock_server = setup_mock_server().await;
        
        Mock::given(method("POST"))
            .and(path("/rest/api/3/search/jql"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "issues": [
                    {
                        "id": "10001",
                        "key": "PROJ-123",
                        "fields": {
                            "summary": "Test issue",
                            "status": {
                                "name": "Open",
                                "statusCategory": { "key": "new", "name": "To Do" }
                            },
                            "issuetype": { "name": "Task", "subtask": false },
                            "created": "2024-01-15T10:00:00.000Z",
                            "updated": "2024-01-16T14:00:00.000Z",
                            "subtasks": []
                        }
                    }
                ],
                "isLast": true
            })))
            .mount(&mock_server)
            .await;

        let result = jira_api_request(
            mock_server.uri(),
            "test@example.com".to_string(),
            "api-token".to_string(),
            "assignee = currentUser()".to_string(),
            Some("3".to_string()),
            Some("Basic".to_string()),
        ).await;

        assert!(result.is_ok());
        let response = result.unwrap();
        assert_eq!(response.issues.len(), 1);
        assert_eq!(response.issues[0].key, "PROJ-123");
        assert_eq!(response.issues[0].fields.summary, "Test issue");
        assert!(response.is_last);
    }

    #[tokio::test]
    async fn test_search_v2_uses_search_endpoint() {
        let mock_server = setup_mock_server().await;
        
        Mock::given(method("POST"))
            .and(path("/rest/api/2/search"))  // v2 uses /search, not /search/jql
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "issues": [],
                "startAt": 0,
                "maxResults": 50,
                "total": 0
            })))
            .mount(&mock_server)
            .await;

        let result = jira_api_request(
            mock_server.uri(),
            "test@example.com".to_string(),
            "api-token".to_string(),
            "project = TEST".to_string(),
            Some("2".to_string()),
            Some("Basic".to_string()),
        ).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap().issues.len(), 0);
    }

    #[tokio::test]
    async fn test_search_jql_error() {
        let mock_server = setup_mock_server().await;
        
        Mock::given(method("POST"))
            .and(path("/rest/api/3/search/jql"))
            .respond_with(ResponseTemplate::new(400).set_body_json(json!({
                "errorMessages": ["Error in the JQL Query: 'invalid' is not valid"]
            })))
            .mount(&mock_server)
            .await;

        let result = jira_api_request(
            mock_server.uri(),
            "test@example.com".to_string(),
            "api-token".to_string(),
            "invalid syntax".to_string(),
            Some("3".to_string()),
            Some("Basic".to_string()),
        ).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("400"));
    }
}

mod worklog_tests {
    use super::*;
    use worktrace_lib::jira::worklogs::{jira_add_worklog, jira_get_worklogs, jira_delete_worklog};
    use worktrace_lib::jira::types::{JiraConnection, WorklogPayload};

    fn test_connection(base_url: &str) -> JiraConnection {
        JiraConnection {
            url: base_url.to_string(),
            username: "test@example.com".to_string(),
            password: "api-token".to_string(),
            api_version: "3".to_string(),
            auth_type: "Basic".to_string(),
        }
    }

    #[tokio::test]
    async fn test_add_worklog_success() {
        let mock_server = setup_mock_server().await;
        
        Mock::given(method("POST"))
            .and(path("/rest/api/3/issue/PROJ-123/worklog"))
            .respond_with(ResponseTemplate::new(201).set_body_json(json!({
                "id": "10100",
                "author": { "displayName": "John Doe" },
                "timeSpentSeconds": 3600
            })))
            .mount(&mock_server)
            .await;

        let payload = WorklogPayload {
            time_spent_seconds: 3600,
            started: "2024-01-15T10:00:00.000+00:00".to_string(),
            comment: "Test work".to_string(),
        };

        let result = jira_add_worklog(
            test_connection(&mock_server.uri()),
            "PROJ-123".to_string(),
            payload,
        ).await;

        assert!(result.is_ok());
        assert_eq!(result.unwrap().id, "10100");
    }

    #[tokio::test]
    async fn test_get_worklogs_v3_adf_comment() {
        let mock_server = setup_mock_server().await;
        
        Mock::given(method("GET"))
            .and(path("/rest/api/3/issue/PROJ-123/worklog"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "worklogs": [
                    {
                        "id": "10100",
                        "author": { "displayName": "John Doe", "emailAddress": "john@example.com" },
                        "comment": {
                            "version": 1,
                            "type": "doc",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [{ "type": "text", "text": "ADF comment" }]
                                }
                            ]
                        },
                        "started": "2024-01-15T10:00:00.000Z",
                        "timeSpent": "1h",
                        "timeSpentSeconds": 3600,
                        "created": "2024-01-15T10:00:00.000Z",
                        "updated": "2024-01-15T10:00:00.000Z"
                    }
                ],
                "total": 1,
                "maxResults": 20,
                "startAt": 0
            })))
            .mount(&mock_server)
            .await;

        let result = jira_get_worklogs(
            test_connection(&mock_server.uri()),
            "PROJ-123".to_string(),
        ).await;

        assert!(result.is_ok());
        let response = result.unwrap();
        assert_eq!(response.worklogs.len(), 1);
        assert_eq!(response.worklogs[0].comment, Some("ADF comment".to_string()));
    }

    #[tokio::test]
    async fn test_get_worklogs_v2_string_comment() {
        let mock_server = setup_mock_server().await;
        
        Mock::given(method("GET"))
            .and(path("/rest/api/2/issue/PROJ-123/worklog"))
            .respond_with(ResponseTemplate::new(200).set_body_json(json!({
                "worklogs": [
                    {
                        "id": "10100",
                        "author": { "name": "jdoe", "displayName": "John Doe" },
                        "comment": "Plain text comment",
                        "started": "2024-01-15T10:00:00.000+0000",
                        "timeSpent": "1h",
                        "timeSpentSeconds": 3600,
                        "created": "2024-01-15T10:00:00.000+0000",
                        "updated": "2024-01-15T10:00:00.000+0000"
                    }
                ],
                "total": 1,
                "maxResults": 20,
                "startAt": 0
            })))
            .mount(&mock_server)
            .await;

        let mut conn = test_connection(&mock_server.uri());
        conn.api_version = "2".to_string();

        let result = jira_get_worklogs(conn, "PROJ-123".to_string()).await;

        assert!(result.is_ok());
        let response = result.unwrap();
        assert_eq!(response.worklogs[0].comment, Some("Plain text comment".to_string()));
        assert_eq!(response.worklogs[0].author.as_ref().unwrap().name, Some("jdoe".to_string()));
    }

    #[tokio::test]
    async fn test_delete_worklog_success() {
        let mock_server = setup_mock_server().await;
        
        Mock::given(method("DELETE"))
            .and(path("/rest/api/3/issue/PROJ-123/worklog/10100"))
            .respond_with(ResponseTemplate::new(204))
            .mount(&mock_server)
            .await;

        let result = jira_delete_worklog(
            test_connection(&mock_server.uri()),
            "PROJ-123".to_string(),
            "10100".to_string(),
        ).await;

        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_delete_worklog_not_found() {
        let mock_server = setup_mock_server().await;
        
        Mock::given(method("DELETE"))
            .and(path("/rest/api/3/issue/PROJ-123/worklog/99999"))
            .respond_with(ResponseTemplate::new(404).set_body_json(json!({
                "errorMessages": ["Worklog with id '99999' not found"]
            })))
            .mount(&mock_server)
            .await;

        let result = jira_delete_worklog(
            test_connection(&mock_server.uri()),
            "PROJ-123".to_string(),
            "99999".to_string(),
        ).await;

        assert!(result.is_err());
        assert!(result.unwrap_err().contains("404"));
    }
}

mod parsing_tests {
    use worktrace_lib::jira::issues::{parse_jira_date, parse_search_response};
    use worktrace_lib::jira::worklogs::parse_worklog;

    #[test]
    fn test_parse_search_response_from_fixture() {
        let fixture = include_str!("../src/jira/fixtures/search_success_v3.json");
        let json: serde_json::Value = serde_json::from_str(fixture).unwrap();
        
        let issues = parse_search_response(&json, "3");
        
        assert_eq!(issues.len(), 2);
        assert_eq!(issues[0].key, "PROJ-123");
        assert_eq!(issues[0].fields.summary, "Implement user authentication");
        assert_eq!(issues[0].fields.status.name, "In Progress");
        assert!(issues[0].fields.assignee.is_some());
        
        assert_eq!(issues[1].key, "PROJ-124");
        assert!(issues[1].fields.assignee.is_none());
        assert_eq!(issues[1].fields.subtasks.len(), 1);
    }

    #[test]
    fn test_parse_worklog_list_from_fixture_v3() {
        let fixture = include_str!("../src/jira/fixtures/worklog_list_success_v3.json");
        let json: serde_json::Value = serde_json::from_str(fixture).unwrap();
        
        let worklogs: Vec<_> = json["worklogs"].as_array().unwrap()
            .iter()
            .map(parse_worklog)
            .collect();
        
        assert_eq!(worklogs.len(), 2);
        assert_eq!(worklogs[0].id, "10100");
        assert_eq!(worklogs[0].time_spent_seconds, 7200);
        assert_eq!(worklogs[0].comment, Some("Implemented login flow".to_string()));
        
        // Second worklog has no comment
        assert!(worklogs[1].comment.is_none());
    }

    #[test]
    fn test_parse_worklog_list_from_fixture_v2() {
        let fixture = include_str!("../src/jira/fixtures/worklog_list_success_v2.json");
        let json: serde_json::Value = serde_json::from_str(fixture).unwrap();
        
        let worklogs: Vec<_> = json["worklogs"].as_array().unwrap()
            .iter()
            .map(parse_worklog)
            .collect();
        
        assert_eq!(worklogs.len(), 1);
        assert_eq!(worklogs[0].id, "10100");
        // v2 uses plain string comments
        assert_eq!(worklogs[0].comment, Some("Fixed login redirect issue".to_string()));
        // v2 uses 'name' field for author
        assert_eq!(worklogs[0].author.as_ref().unwrap().name, Some("jdoe".to_string()));
    }

    #[test]
    fn test_parse_jira_date_formats() {
        // RFC3339 with Z
        assert!(parse_jira_date(Some("2024-01-15T10:30:00.000Z")) > 0);
        
        // JIRA format without colon in offset
        assert!(parse_jira_date(Some("2024-01-15T10:30:00.000+0000")) > 0);
        
        // Both should parse to the same timestamp
        let ts1 = parse_jira_date(Some("2024-01-15T10:30:00.000Z"));
        let ts2 = parse_jira_date(Some("2024-01-15T10:30:00.000+0000"));
        assert_eq!(ts1, ts2);
    }
}
