use reqwest::blocking::Client;
use reqwest::Method;

// Helper function to create a configured request builder
pub fn create_client_request(
    client: &Client,
    method: Method,
    url: &str,
    api_version: &str,
    path: &str,
    username: &str,
    password: &str,
    auth_type: &str,
) -> reqwest::blocking::RequestBuilder {
    let endpoint = format!("{}/rest/api/{}/{}", url, api_version, path);
    let mut req = client.request(method, &endpoint)
        .header("Accept", "application/json")
        .header("X-Atlassian-Token", "no-check");

    if auth_type == "Bearer" {
        req = req.bearer_auth(password);
    } else {
        req = req.basic_auth(username, Some(password));
    }
    req
}
