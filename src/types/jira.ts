export interface JiraConfig {
  url: string | null;
  username: string | null;
  password: string | null;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    created: number; // Unix timestamp in milliseconds
    updated: number; // Unix timestamp in milliseconds
  };
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
  isLast?: boolean;
}

export interface WorklogPayload {
  timeSpentSeconds: number;
  started: string;
  comment: string;
}

export interface WorklogResponse {
  id: string;
}
