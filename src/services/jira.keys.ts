/**
 * Query keys for JIRA-related React Query hooks
 * Centralized to ensure cache consistency
 */
export const jiraKeys = {
  all: ["jira"] as const,
  config: () => [...jiraKeys.all, "config"] as const,
  currentUser: () => [...jiraKeys.all, "currentUser"] as const,
  issues: () => [...jiraKeys.all, "issues"] as const,
  myIssues: () => [...jiraKeys.issues(), "my"] as const,
  issuesByJql: (jql: string) => [...jiraKeys.issues(), "jql", jql] as const,
  worklogs: () => [...jiraKeys.all, "worklogs"] as const,
  issueWorklogs: (issueKey: string) => [...jiraKeys.worklogs(), issueKey] as const,
}
