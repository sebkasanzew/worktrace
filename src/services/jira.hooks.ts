import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
} from "@tanstack/react-query"
import { format } from "date-fns"
import type {
  JiraSearchResponse,
  JiraUserSession,
  JiraWorklogListResponse,
  UserWorklogsResponse,
} from "@/types/bindings"
import type { WorklogPayload, WorklogResponse } from "@/types/jira"
import { configService } from "./jira"
import { jiraKeys } from "./jira.keys"
import { createJiraClient } from "./jiraClient"

/**
 * Hook to fetch current user session from JIRA
 * Requires valid JIRA configuration
 */
export function useCurrentUser(): UseQueryResult<JiraUserSession, Error> {
  return useQuery({
    queryKey: jiraKeys.currentUser(),
    queryFn: async () => {
      const config = await configService.get()
      if (!config) throw new Error("JIRA configuration missing")
      const client = createJiraClient(config)
      return client.getCurrentUser()
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch current user's unresolved issues from JIRA
 * Requires valid JIRA configuration
 */
export function useMyIssues(): UseQueryResult<JiraSearchResponse, Error> {
  return useQuery({
    queryKey: jiraKeys.myIssues(),
    queryFn: async () => {
      const config = await configService.get()
      if (!config) throw new Error("JIRA configuration missing")
      const client = createJiraClient(config)
      return client.getCurrentUserIssues()
    },
    retry: 1,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Hook to search JIRA issues with custom JQL
 * Requires valid JIRA configuration
 */
export function useIssuesByJql(jql: string): UseQueryResult<JiraSearchResponse, Error> {
  return useQuery({
    queryKey: jiraKeys.issuesByJql(jql),
    queryFn: async () => {
      const config = await configService.get()
      if (!config) throw new Error("JIRA configuration missing")
      const client = createJiraClient(config)
      return client.searchIssues(jql)
    },
    enabled: !!jql,
    retry: 1,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
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
      const config = await configService.get()
      if (!config) throw new Error("JIRA configuration missing")
      const client = createJiraClient(config)
      return client.addWorklog(issueKey, payload)
    },
  })
}

/**
 * Hook to fetch worklogs for a specific issue
 * Requires valid JIRA configuration
 */
export function useIssueWorklogs(issueKey: string): UseQueryResult<JiraWorklogListResponse, Error> {
  return useQuery({
    queryKey: jiraKeys.issueWorklogs(issueKey),
    queryFn: async () => {
      const config = await configService.get()
      if (!config) throw new Error("JIRA configuration missing")
      const client = createJiraClient(config)
      return client.getWorklogs(issueKey)
    },
    enabled: !!issueKey,
    retry: 1,
    staleTime: 30 * 1000, // 30 seconds
  })
}

/**
 * Hook to fetch worklogs for the current user within a date range
 * Requires valid JIRA configuration
 */
export function useUserWorklogsByDateRange(
  startDate: string,
  endDate: string
): UseQueryResult<UserWorklogsResponse, Error> {
  return useQuery({
    queryKey: jiraKeys.userWorklogs(startDate, endDate),
    queryFn: async () => {
      const config = await configService.get()
      if (!config) throw new Error("JIRA configuration missing")
      const client = createJiraClient(config)
      return client.getUserWorklogsByDateRange(startDate, endDate)
    },
    enabled: !!startDate && !!endDate,
    retry: 1,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch worklogs for today
 * Convenience wrapper around useUserWorklogsByDateRange
 * Includes periodic refresh every minute
 */
export function useTodaysWorklogs(): UseQueryResult<UserWorklogsResponse, Error> {
  const today = format(new Date(), "yyyy-MM-dd")
  return useQuery({
    queryKey: jiraKeys.userWorklogs(today, today),
    queryFn: async () => {
      const config = await configService.get()
      if (!config) throw new Error("JIRA configuration missing")
      const client = createJiraClient(config)
      return client.getUserWorklogsByDateRange(today, today)
    },
    enabled: true,
    retry: 1,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every 1 minute
  })
}

/**
 * Mutation to update a worklog
 */
export function useUpdateWorklog(): UseMutationResult<
  WorklogResponse,
  Error,
  {
    issueKey: string
    worklogId: string
    timeSpentSeconds: number
    comment: string
    started: string
  }
> {
  return useMutation({
    mutationFn: async ({ issueKey, worklogId, timeSpentSeconds, comment, started }) => {
      const config = await configService.get()
      if (!config) throw new Error("JIRA configuration missing")
      const client = createJiraClient(config)
      return client.updateWorklog(issueKey, worklogId, { timeSpentSeconds, comment, started })
    },
  })
}

/**
 * Mutation to delete a worklog
 */
export function useDeleteWorklog(): UseMutationResult<
  void,
  Error,
  { issueKey: string; worklogId: string }
> {
  return useMutation({
    mutationFn: async ({ issueKey, worklogId }) => {
      const config = await configService.get()
      if (!config) throw new Error("JIRA configuration missing")
      const client = createJiraClient(config)
      return client.deleteWorklog(issueKey, worklogId)
    },
  })
}
