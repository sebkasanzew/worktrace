use serde::{Deserialize, Serialize};
use specta::Type;

/// JIRA issue status
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraStatus {
    pub name: String,
}

/// JIRA issue assignee
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraAssignee {
    pub display_name: String,
    pub email_address: String,
}

/// JIRA issue fields
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraFields {
    pub summary: String,
    pub status: JiraStatus,
    pub assignee: Option<JiraAssignee>,
    /// Unix timestamp in milliseconds (for JavaScript Date compatibility)
    pub created: i64,
    /// Unix timestamp in milliseconds (for JavaScript Date compatibility)
    pub updated: i64,
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
}

/// JIRA configuration stored in app settings
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraConfig {
    pub url: Option<String>,
    pub username: Option<String>,
    pub password: Option<String>,
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

/// Minimal worklog response
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WorklogResponse {
    pub id: String,
}
