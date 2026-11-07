'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/notifications.service'

export interface BannerPayload {
  id: string
  title: string
  body: string
  type?: string
  relatedId?: string | null
  deepLink?: string | null
}

interface Ctx {
  userId: string | null
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  refresh: () => Promise<void>
  markOneRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  banner: BannerPayload | null
  dismissBanner: () => void
  activeChatId: string | null
  setActiveChatId: (id: string | null) => void
}

const NotificationCtx = createContext<Ctx | null>(null)

const seenKeys = new Set<string>()
function shouldProcess(key: string): boolean {
  if (!key) return true
  if (seenKeys.has(key)) return false
  seenKeys.add(key)
  setTimeout(() => seenKeys.delete(key), 8000)
  return true
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [banner, setBanner] = useState<BannerPayload | null>(null)
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeChatIdRef = useRef<string | null>(null)

  useEffect(() => {
    activeChatIdRef.current = activeChatId
  }, [activeChatId])

  // Resolve the current user (and listen for auth changes)
  useEffect(() => {
    const sb = createClient()
    let mounted = true
    void sb.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setUserId(user?.id ?? null)
    })
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      return
    }
    setLoading(true)
    const result = await fetchNotifications(userId)
    setLoading(false)
    if (result.data) setNotifications(result.data)
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Realtime subscription on the notifications table, filtered by user_id
  useEffect(() => {
    if (!userId) return
    const sb = createClient()
    const channel = sb
      .channel(`notifications:${userId}:${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          void refresh()
          if (payload.eventType === 'INSERT' && payload.new) {
            const row = payload.new as {
              id?: string
              title?: string
              body?: string
              type?: string
              related_id?: string | null
              deep_link?: string | null
            }
            if (row.title && row.body) {
              // Suppress chat banner when the user is already viewing that thread
              if (
                row.type === 'chat_message' &&
                row.related_id &&
                activeChatIdRef.current === row.related_id
              ) {
                return
              }

              const dedupe =
                row.id || `${row.type}_${row.title}_${row.related_id ?? ''}`
              if (!shouldProcess(dedupe)) return

              if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
              setBanner({
                id: row.id ?? `banner_${Date.now()}`,
                title: row.title,
                body: row.body,
                type: row.type,
                relatedId: row.related_id ?? undefined,
                deepLink: row.deep_link ?? undefined,
              })
              bannerTimerRef.current = setTimeout(() => setBanner(null), 5000)
            }
          }
        },
      )
      .subscribe()

    return () => {
      try {
        void sb.removeChannel(channel)
      } catch {
        /* noop */
      }
    }
  }, [userId, refresh])

  // Refresh on window focus (tab revisit)
  useEffect(() => {
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const markOneRead = useCallback(
    async (id: string) => {
      if (!userId) return
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      )
      await markNotificationRead(id, userId)
    },
    [userId],
  )

  const markAllRead = useCallback(async () => {
    if (!userId) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await markAllNotificationsRead(userId)
  }, [userId])

  const dismissBanner = useCallback(() => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current)
    setBanner(null)
  }, [])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  )

  const value: Ctx = {
    userId,
    notifications,
    unreadCount,
    loading,
    refresh,
    markOneRead,
    markAllRead,
    banner,
    dismissBanner,
    activeChatId,
    setActiveChatId,
  }

  return <NotificationCtx.Provider value={value}>{children}</NotificationCtx.Provider>
}

export function useNotifications(): Ctx {
  const ctx = useContext(NotificationCtx)
  if (!ctx) {
    throw new Error('useNotifications must be used within <NotificationProvider>')
  }
  return ctx
}

export function useOptionalNotifications(): Ctx | null {
  return useContext(NotificationCtx)
}
