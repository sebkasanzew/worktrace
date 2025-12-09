use reqwest::Client;
use reqwest::Method;

use super::types::JiraConnection;

/// Request configuration for JIRA API calls (internal use)
pub struct RequestConfig<'a> {
    pub url: &'a str,
    pub api_version: &'a str,
    pub username: &'a str,
    pub password: &'a str,
    pub auth_type: &'a str,
}

impl<'a> From<&'a JiraConnection> for RequestConfig<'a> {
    fn from(conn: &'a JiraConnection) -> Self {
        Self {
            url: &conn.url,
            api_version: &conn.api_version,
            username: &conn.username,
            password: &conn.password,
            auth_type: &conn.auth_type,
        }
    }
}

// Helper function to create a configured request builder
pub fn create_client_request(
    client: &Client,
    method: Method,
    config: &RequestConfig,
    path: &str,
) -> reqwest::RequestBuilder {
    let endpoint = format!("{}/rest/api/{}/{}", config.url, config.api_version, path);
    let mut req = client.request(method, &endpoint)
        .header("Accept", "application/json")
        .header("X-Atlassian-Token", "no-check");

    if config.auth_type == "Bearer" {
        req = req.bearer_auth(config.password);
    } else {
        req = req.basic_auth(config.username, Some(config.password));
    }
    req
}
