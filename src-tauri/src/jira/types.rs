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

/// JIRA worklog author
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct JiraWorklogAuthor {
    pub display_name: String,
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
