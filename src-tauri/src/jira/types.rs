use serde::{Deserialize, Serialize};
use specta::Type;

/// JIRA status category
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraStatusCategory {
    pub key: String,
    pub name: String,
}

/// JIRA issue status
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraStatus {
    pub name: String,
    pub status_category: Option<JiraStatusCategory>,
}

/// JIRA issue assignee
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraAssignee {
    pub display_name: String,
    pub email_address: String,
}

/// JIRA issue type
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraIssueType {
    pub name: String,
    pub subtask: bool,
}

/// JIRA subtask fields
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraSubtaskFields {
    pub summary: String,
    pub status: JiraStatus,
}

/// JIRA subtask
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraSubtask {
    pub id: String,
    pub key: String,
    pub fields: JiraSubtaskFields,
}

/// JIRA issue fields
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraFields {
    pub summary: String,
    pub status: JiraStatus,
    pub issuetype: JiraIssueType,
    pub assignee: Option<JiraAssignee>,
    /// Unix timestamp in milliseconds (for JavaScript Date compatibility)
    pub created: i64,
    /// Unix timestamp in milliseconds (for JavaScript Date compatibility)
    pub updated: i64,
    pub subtasks: Vec<JiraSubtask>,
}

/// JIRA issue
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraIssue {
    pub id: String,
    pub key: String,
    pub fields: JiraFields,
}

/// JIRA search API response
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraSearchResponse {
    pub issues: Vec<JiraIssue>,
    pub total: u64,
    pub is_last: bool,
}

/// JIRA current user session info
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraUserSession {
    pub name: String,
    pub api_version: String,
    pub auth_type: String,
}

/// JIRA configuration stored in app settings
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraSettings {
    pub instance_url: String,
    pub username: String,
    pub api_token: String,
    #[serde(default = "default_api_version")]
    pub api_version: String,
    #[serde(default = "default_auth_type")]
    pub auth_type: String,
}

fn default_api_version() -> String {
    "3".to_string()
}

fn default_auth_type() -> String {
    "Basic".to_string()
}

/// General application settings
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GeneralSettings {
    pub theme: String,
    pub worklog_types: Vec<WorklogType>,
    pub default_worklog_description: String,
    pub enable_automatic_updates: bool,
    pub always_on_top: bool,
    pub custom_issue_keys: Vec<String>,
    #[serde(default)]
    pub rounding_step: u8,
}

/// Application settings
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub general: GeneralSettings,
    pub jira: Option<JiraSettings>,
}

/// JIRA connection parameters for API calls
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraConnection {
    pub url: String,
    pub username: String,
    pub password: String,
    #[serde(default = "default_api_version")]
    pub api_version: String,
    #[serde(default = "default_auth_type")]
    pub auth_type: String,
}

/// Worklog payload for creating a worklog in JIRA
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WorklogPayload {
    #[serde(rename = "timeSpentSeconds")]
    pub time_spent_seconds: u32,
    pub started: String,
    pub comment: String,
}

/// Worklog type configuration
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WorklogType {
    pub name: String,
    pub short_code: String,
}

/// Minimal worklog response
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WorklogResponse {
    pub id: String,
}

/// JIRA worklog author
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraWorklogAuthor {
    pub display_name: String,
    /// Username (used in API v2, e.g., "jdoe")
    pub name: Option<String>,
    /// Email address (used in API v3)
    pub email_address: Option<String>,
    pub avatar_urls: Option<Vec<(String, String)>>,
}

/// JIRA worklog
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraWorklog {
    pub id: String,
    pub author: Option<JiraWorklogAuthor>,
    pub update_author: Option<JiraWorklogAuthor>,
    pub comment: Option<String>,
    pub created: String,
    pub updated: String,
    pub started: String,
    pub time_spent: String,
    pub time_spent_seconds: u64,
}

/// JIRA worklog list response
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraWorklogListResponse {
    pub worklogs: Vec<JiraWorklog>,
    pub total: u64,
    pub max_results: u64,
    pub start_at: u64,
}

/// User worklog entry with issue context
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UserWorklogEntry {
    pub issue_key: String,
    pub issue_summary: String,
    pub worklog: JiraWorklog,
}

/// Response for user worklogs by date range
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UserWorklogsResponse {
    pub entries: Vec<UserWorklogEntry>,
    pub start_date: String,
    pub end_date: String,
    pub total_time_seconds: u64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_jira_user_session_deserialize() {
        let json = r#"{"name": "John Doe", "apiVersion": "3", "authType": "Basic"}"#;
        let session: JiraUserSession = serde_json::from_str(json).unwrap();
        assert_eq!(session.name, "John Doe");
        assert_eq!(session.api_version, "3");
        assert_eq!(session.auth_type, "Basic");
    }

    #[test]
    fn test_jira_connection_default_values() {
        let json = r#"{
            "url": "https://example.atlassian.net",
            "username": "test@example.com",
            "password": "token"
        }"#;
        let conn: JiraConnection = serde_json::from_str(json).unwrap();
        assert_eq!(conn.api_version, "3");
        assert_eq!(conn.auth_type, "Basic");
    }

    #[test]
    fn test_worklog_payload_serialize() {
        let payload = WorklogPayload {
            time_spent_seconds: 3600,
            started: "2024-01-15T10:00:00.000+0000".to_string(),
            comment: "Test comment".to_string(),
        };
        let json = serde_json::to_value(&payload).unwrap();
        assert_eq!(json["timeSpentSeconds"], 3600);
        assert_eq!(json["started"], "2024-01-15T10:00:00.000+0000");
    }

    #[test]
    fn test_jira_worklog_author_optional_fields() {
        let json = r#"{"displayName": "John Doe"}"#;
        let author: JiraWorklogAuthor = serde_json::from_str(json).unwrap();
        assert_eq!(author.display_name, "John Doe");
        assert!(author.name.is_none());
        assert!(author.email_address.is_none());
    }

    #[test]
    fn test_jira_status_category_roundtrip() {
        let category = JiraStatusCategory {
            key: "done".to_string(),
            name: "Done".to_string(),
        };
        let json = serde_json::to_string(&category).unwrap();
        let parsed: JiraStatusCategory = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.key, "done");
        assert_eq!(parsed.name, "Done");
    }
}
