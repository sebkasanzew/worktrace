import { debug, info } from "@tauri-apps/plugin-log"
import { Store } from "@tauri-apps/plugin-store"
import { useCallback, useEffect, useRef, useState } from "react"

type ActiveTimer = {
  issueKey: string
  startedAt: number // epoch ms when started (excluding offset)
  offsetMs: number // accumulated ms when resumed from pauses
  pausedAt?: number // epoch ms when paused (dialog open)
}

type PersistShape = ActiveTimer | null

const STORE_FILE = "time-tracker.json"
const STORE_KEY = "activeTimer"

async function loadStore(): Promise<Store> {
  // Store.load creates/opens store file in app data dir
  return await Store.load(STORE_FILE)
}

function now() {
  return Date.now()
}

function computeElapsedMs(timer: ActiveTimer | null): number {
  if (!timer) return 0
  const base = timer.offsetMs
  if (timer.pausedAt) {
    return base + (timer.pausedAt - timer.startedAt)
  }
  return base + (now() - timer.startedAt)
}

export function useTimeTracker() {
  const [active, setActive] = useState<ActiveTimer | null>(null)
  const [pendingIssueKey, setPendingIssueKey] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const tickRef = useRef<number | null>(null)

  // a small state just to force re-render during ticking
  const [, setTick] = useState(0)
  const activeRef = useRef<ActiveTimer | null>(active)
  useEffect(() => {
    activeRef.current = active
  }, [active])

  // persist on change
  useEffect(() => {
    ;(async () => {
      const store = await loadStore()
      await store.set(STORE_KEY, active as PersistShape)
      await store.save()
      if (active) {
        debug(`[Timer] Persisted active: ${active.issueKey}`)
      } else {
        debug("[Timer] Cleared active timer")
      }
    })()
  }, [active])

  // restore once
  useEffect(() => {
    ;(async () => {
      const store = await loadStore()
      const persisted = (await store.get<PersistShape>(STORE_KEY)) || null
      if (persisted) {
        info(`[Timer] Restoring timer for ${persisted.issueKey}`)
        setActive(persisted)
      }
    })()
    // start a raf/interval tick for re-render
    const id = window.setInterval(() => {
      // trigger re-render while active to update elapsed
      if (activeRef.current) {
        setTick((t) => t + 1)
      }
    }, 1000)
    tickRef.current = id
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current)
    }
  }, [])

  const activeIssueKey = active?.issueKey ?? null
  const elapsedMs = computeElapsedMs(active)

  const start = useCallback((issueKey: string) => {
    info(`[Timer] Start ${issueKey}`)
    setActive({ issueKey, startedAt: now(), offsetMs: 0 })
    setPendingIssueKey(null)
    setDialogOpen(false)
  }, [])

  const requestStart = useCallback(
    (issueKey: string) => {
      const a = activeRef.current
      if (!a) {
        start(issueKey)
        return
      }
      if (a.issueKey === issueKey) {
        // already running for this issue
        return
      }
      // pause current and open dialog; queue new
      info(`[Timer] Queue start ${issueKey} after logging ${a.issueKey}`)
      setActive((prev) => (prev ? { ...prev, pausedAt: now() } : prev))
      setPendingIssueKey(issueKey)
      setDialogOpen(true)
    },
    [start]
  )

  const stopAndOpenDialog = useCallback(() => {
    const a = activeRef.current
    if (!a) return
    info(`[Timer] Stop (open dialog) ${a.issueKey}`)
    setActive((prev) => (prev ? { ...prev, pausedAt: now() } : prev))
    setDialogOpen(true)
  }, [])

  const resume = useCallback(() => {
    const a = activeRef.current
    if (!a || !a.pausedAt) {
      setDialogOpen(false)
      return
    }
    const pausedFor = now() - a.pausedAt
    info(`[Timer] Resume ${a.issueKey} (paused ${pausedFor}ms)`)
    setActive({
      issueKey: a.issueKey,
      startedAt: now(),
      offsetMs: a.offsetMs + (a.pausedAt - a.startedAt),
    })
    setDialogOpen(false)
    setPendingIssueKey(null)
  }, [])

  const clearAfterLogged = useCallback(() => {
    const queued = pendingIssueKey
    info("[Timer] Clear after logged")
    setActive(null)
    setDialogOpen(false)
    setPendingIssueKey(null)
    if (queued) {
      // start queued after a microtask to ensure state commits
      setTimeout(() => start(queued), 0)
    }
  }, [pendingIssueKey, start])

  const getElapsedFor = useCallback((issueKey: string): number => {
    if (!activeRef.current || activeRef.current.issueKey !== issueKey) return 0
    return computeElapsedMs(activeRef.current)
  }, [])

  return {
    // state
    activeIssueKey,
    dialogOpen,
    // computed
    elapsedMs,
    getElapsedFor,
    // actions
    requestStart,
    stopAndOpenDialog,
    resume,
    clearAfterLogged,
  } as const
}
