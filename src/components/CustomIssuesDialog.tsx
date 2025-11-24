import { debug } from "@tauri-apps/plugin-log"
import { Loader2, Minus, Plus, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { IssueListItem } from "@/components/IssueListItem"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useIssuesByJql } from "@/services/jira.hooks"
import { useAppSettings, useSaveAppSettings } from "@/services/settings.hooks"
import type { JiraIssue } from "@/types/bindings"

interface CustomIssuesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onIssuesChanged?: () => void
}

export function CustomIssuesDialog({
  open,
  onOpenChange,
  onIssuesChanged,
}: CustomIssuesDialogProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const { data: settings } = useAppSettings()
  const { mutate: saveSettings } = useSaveAppSettings()

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // JQL for search: search by key or summary
  const searchJql = useMemo(() => {
    const trimmedQuery = debouncedQuery.trim()
    if (!trimmedQuery) return ""

    const parts: string[] = []

    // Only search by exact key if it looks like a full issue key (e.g. PROJ-123)
    // This prevents "Invalid issue key" errors from JIRA
    if (/^[a-zA-Z]+-\d+$/.test(trimmedQuery)) {
      parts.push(`key = "${trimmedQuery}"`)
    }

    // Always search summary
    parts.push(`summary ~ "${trimmedQuery}*"`)

    // If query looks like a project key (letters, optionally ending with hyphen), try to match as project key prefix
    // This allows "KAN" to find "KAN-1", "KAN-5", etc.
    if (/^[a-zA-Z]+-?$/.test(trimmedQuery)) {
      const projectKey = trimmedQuery.replace(/-$/, "").toUpperCase()

      // Use the CONTAINS (~) operator for fuzzy search on issue key
      // This is the standard way to find issues by partial key in JQL (e.g. issueKey ~ "KAN*")
      // BUT: JIRA API v2 (Server/DC) does not support ~ operator on issueKey field
      const apiVersion = settings?.jira?.apiVersion || "3"
      if (apiVersion === "3") {
        parts.push(`issueKey ~ "${projectKey}*"`)
        debug(`Detected project key search: ${projectKey} -> issueKey ~ "${projectKey}*"`)
      }
      // For v2, we skip fuzzy key search to avoid errors.
      // We can't safely use 'project = ...' because it errors if the project doesn't exist,
      // which would break summary search for words that look like project keys.
    }

    const jql = `(${parts.join(" OR ")}) AND issuetype not in subTaskIssueTypes() ORDER BY updated DESC`
    debug(`Generated JQL: ${jql}`)
    return jql
  }, [debouncedQuery, settings?.jira?.apiVersion])

  const { data: searchResults, isLoading: isSearching } = useIssuesByJql(searchJql)

  const customIssueKeys = settings?.general.customIssueKeys || []

  // Fetch details for selected issues
  const selectedIssuesJql =
    customIssueKeys.length > 0 ? `key in (${customIssueKeys.join(",")})` : ""
  const { data: selectedIssuesData } = useIssuesByJql(selectedIssuesJql)

  const handleAddIssue = (issue: JiraIssue) => {
    if (!settings) return
    if (customIssueKeys.includes(issue.key)) return

    const newKeys = [...customIssueKeys, issue.key]
    saveSettings(
      {
        ...settings,
        general: {
          ...settings.general,
          customIssueKeys: newKeys,
        },
      },
      {
        onSuccess: () => onIssuesChanged?.(),
      }
    )
  }

  const handleRemoveIssue = (key: string) => {
    if (!settings) return
    const newKeys = customIssueKeys.filter((k) => k !== key)
    saveSettings(
      {
        ...settings,
        general: {
          ...settings.general,
          customIssueKeys: newKeys,
        },
      },
      {
        onSuccess: () => onIssuesChanged?.(),
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("Manage Custom Issues")}</DialogTitle>
          <DialogDescription>
            {t("Add issues that are not assigned to you but you want to track.")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("Search by issue key or summary...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden min-h-[300px]">
            {/* Search Results */}
            <Card className="flex flex-col overflow-hidden">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("Search Results")}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-2 pt-0">
                {isSearching ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : searchResults?.issues?.length ? (
                  <div className="flex flex-col gap-2">
                    {searchResults.issues.map((issue) => {
                      const isAdded = customIssueKeys.includes(issue.key)
                      return (
                        <IssueListItem
                          key={issue.id}
                          issueKey={issue.key}
                          summary={issue.fields.summary}
                          action={
                            <Button
                              size="icon"
                              variant="ghost"
                              className={`h-8 w-8 shrink-0 ${
                                isAdded
                                  ? "text-destructive hover:text-destructive hover:bg-destructive/10"
                                  : ""
                              }`}
                              onClick={() =>
                                isAdded ? handleRemoveIssue(issue.key) : handleAddIssue(issue)
                              }
                            >
                              {isAdded ? (
                                <Minus className="h-4 w-4" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </Button>
                          }
                        />
                      )
                    })}
                  </div>
                ) : debouncedQuery ? (
                  <div className="text-center text-sm text-muted-foreground p-4">
                    {t("No issues found")}
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground p-4">
                    {t("Type to search...")}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Selected Issues */}
            <Card className="flex flex-col overflow-hidden">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("Selected Issues ({{count}})", { count: customIssueKeys.length })}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-2 pt-0">
                {customIssueKeys.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {customIssueKeys.map((key) => {
                      const issue = selectedIssuesData?.issues?.find((i) => i.key === key)
                      return (
                        <IssueListItem
                          key={key}
                          issueKey={key}
                          summary={issue?.fields.summary}
                          action={
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveIssue(key)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          }
                        />
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center text-sm text-muted-foreground p-4">
                    {t("No custom issues added")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
