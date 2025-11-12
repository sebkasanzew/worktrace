export interface JiraConfig {
  url: string | null;
  email: string | null;
  token: string | null;
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
    created: string;
    updated: string;
  };
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
  total: number;
}
