import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import type { JiraSearchResponse, JiraUserSession } from "@/types/bindings";
import type { WorklogPayload, WorklogResponse } from "@/types/jira";
import { configService } from "./jira";
import { jiraKeys } from "./jira.keys";
import { createJiraClient } from "./jiraClient";

/**
 * Hook to fetch current user session from JIRA
 * Requires valid JIRA configuration
 */
export function useCurrentUser(): UseQueryResult<JiraUserSession, Error> {
  return useQuery({
    queryKey: jiraKeys.currentUser(),
    queryFn: async () => {
      const config = await configService.get();
      const client = createJiraClient(config);
      return client.getCurrentUser();
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch current user's unresolved issues from JIRA
 * Requires valid JIRA configuration
 */
export function useMyIssues(): UseQueryResult<JiraSearchResponse, Error> {
  return useQuery({
    queryKey: jiraKeys.myIssues(),
    queryFn: async () => {
      const config = await configService.get();
      const client = createJiraClient(config);
      return client.getCurrentUserIssues();
    },
    retry: 1,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to search JIRA issues with custom JQL
 * Requires valid JIRA configuration
 */
export function useIssuesByJql(jql: string): UseQueryResult<JiraSearchResponse, Error> {
  return useQuery({
    queryKey: jiraKeys.issuesByJql(jql),
    queryFn: async () => {
      const config = await configService.get();
      const client = createJiraClient(config);
      return client.searchIssues(jql);
    },
    enabled: !!jql,
    retry: 1,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Mutation to add a worklog to an issue
 */
export function useAddWorklog(): UseMutationResult<
  WorklogResponse,
  Error,
  { issueKey: string; payload: WorklogPayload }
> {
  return useMutation({
    mutationFn: async ({ issueKey, payload }) => {
      const config = await configService.get();
      const client = createJiraClient(config);
      return client.addWorklog(issueKey, payload);
    },
  });
}
