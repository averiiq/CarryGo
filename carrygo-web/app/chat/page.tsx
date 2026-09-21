'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Clock,
  MessageCircle,
  MessageSquare,
  Package,
  Route,
  User,
  Search,
  CheckCheck,
  Sparkles,
  ShieldCheck,
  Filter,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { createClient } from '@/utils/supabase/client'
import { AnimatedChatBubble, InteractiveIconBadge } from '@/components/ui/animated-icons'

interface ConversationSummary {
  id: string
  request_id: string
  route: string | null
  parcel_description: string | null
  last_message_text: string | null
  last_message_at: string | null
  last_message_sender_id: string | null
  last_message_read?: boolean
  participant_names?: Record<string, string>
  participant_ids?: string[]
}

type FilterTab = 'all' | 'recent' | 'shipments'

export default function ChatInboxPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  useEffect(() => {
    const supabase = createClient()
    const loadInbox = async () => {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      setCurrentUserId(user.id)

      const { data } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [user.id])
        .order('last_message_at', { ascending: false })

      setConversations((data as ConversationSummary[]) || [])
      setLoading(false)
    }

    void loadInbox()
  }, [])

  // Filtered conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (conv.route && conv.route.toLowerCase().includes(q)) ||
        (conv.parcel_description && conv.parcel_description.toLowerCase().includes(q)) ||
        (conv.last_message_text && conv.last_message_text.toLowerCase().includes(q))

      if (!matchesSearch) return false

      if (activeTab === 'recent') {
        if (!conv.last_message_at) return false
        const ageHours = (Date.now() - new Date(conv.last_message_at).getTime()) / (1000 * 60 * 60)
        return ageHours <= 48
      }

      if (activeTab === 'shipments') {
        return Boolean(conv.route || conv.parcel_description)
      }

      return true
    })
  }, [conversations, searchQuery, activeTab])

  // Get recipient display name helper
  const getOtherParticipantName = (conv: ConversationSummary): string => {
    if (!conv.participant_names || !currentUserId) return 'Travel Companion'
    const names = Object.entries(conv.participant_names)
    const other = names.find(([id]) => id !== currentUserId)
    return other ? other[1] : 'Travel Companion'
  }

  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return ''
    const date = new Date(ts)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    }
    if (diffDays === 1) return 'Yesterday'
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  }

  return (
    <MarketingShell>
      <div className="relative min-h-screen pb-20">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none blur-3xl -z-10" />

        <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-10 sm:pt-14 md:pt-16">
          {/* Executive Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-border-subtle">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-subtle text-primary text-xs font-semibold tracking-wide border border-primary/20">
                <AnimatedChatBubble size={20} color="#059669" interactive={false} />
                <span>Private Journey Lounge</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-foreground tracking-tight">
                Messages &amp; Handover
              </h1>
              <p className="text-sm text-muted max-w-xl leading-relaxed">
                Connect directly with your verified travel companion to arrange convenient pickup spots, travel itineraries, and golden passkeys.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-auto">
              <Link
                href="/activity"
                className="px-4 py-2 rounded-xl border border-border-subtle bg-surface hover:bg-surface-elevated text-xs font-semibold text-foreground transition-colors shadow-xs"
              >
                My Deliveries
              </Link>
              <Link
                href="/search"
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary-dark text-xs font-semibold transition-all shadow-sm inline-flex items-center gap-1.5"
              >
                Find Route <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Reassurance & Coordination Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-6">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface/70 border border-border-subtle backdrop-blur-sm shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted uppercase tracking-wider">SafeVault™ Protection</p>
                <p className="text-xs font-bold text-foreground">Golden Passkey Verified</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface/70 border border-border-subtle backdrop-blur-sm shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted uppercase tracking-wider">Travel Lounge</p>
                <p className="text-xs font-bold text-foreground">
                  {conversations.length} Active Channel{conversations.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface/70 border border-border-subtle backdrop-blur-sm shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-medium text-muted uppercase tracking-wider">Transit Method</p>
                <p className="text-xs font-bold text-foreground">Personal Doorstep Handshake</p>
              </div>
            </div>
          </div>

          {/* Controls Bar: Search & Filter Tabs */}
          <div className="py-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="inline-flex p-1 bg-surface rounded-2xl border border-border-subtle shadow-xs">
              {[
                { key: 'all', label: 'All Chats', count: conversations.length },
                { key: 'recent', label: 'Active (48h)' },
                { key: 'shipments', label: 'Shipments' },
              ].map((tab) => {
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as FilterTab)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                          isActive ? 'bg-black/20 text-white' : 'bg-surface-elevated text-muted'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[260px] sm:w-72">
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search route, parcel, message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-surface border border-border-subtle rounded-xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Conversations Content */}
          {loading ? (
            <div className="space-y-3 pt-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-surface border border-border-subtle animate-pulse flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-border-subtle" />
                    <div className="space-y-2">
                      <div className="w-40 h-4 rounded-md bg-border-subtle" />
                      <div className="w-60 h-3 rounded-md bg-border-subtle/60" />
                    </div>
                  </div>
                  <div className="w-16 h-3 rounded-md bg-border-subtle" />
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-3xl p-8 sm:p-10 text-center border border-border-subtle bg-surface/90 space-y-5 max-w-lg mx-auto my-8 shadow-[var(--shadow-bento)] overflow-hidden relative"
            >
              {!searchQuery && (
                <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-border-subtle mb-2 bg-gradient-to-b from-white to-slate-50/60 p-3">
                  <Image
                    src="/images/abstract/chat-coordination.jpg"
                    alt="Encrypted P2P Coordination"
                    fill
                    className="object-contain hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-center">
                <InteractiveIconBadge tone="emerald" className="w-16 h-16">
                  <AnimatedChatBubble size={44} color="#059669" />
                </InteractiveIconBadge>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-heading font-bold text-foreground">
                  {searchQuery ? 'No matching conversations' : 'Your Private Journey Lounge'}
                </h3>
                <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto">
                  {searchQuery
                    ? 'Try searching with a different city name, keyword, or clear the search filter.'
                    : 'Conversations open automatically with verified travel companions to coordinate meeting spots, departure schedules, and golden passkey handshakes.'}
                </p>
              </div>

              <div className="pt-2">
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 rounded-xl border border-border-subtle text-xs font-semibold text-foreground hover:bg-surface-elevated transition"
                  >
                    Clear Filter
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                      href="/search"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary-dark transition shadow-sm"
                    >
                      Browse Available Routes <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      href="/create-parcel"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border-subtle text-xs font-semibold text-foreground hover:bg-surface-elevated transition"
                    >
                      Post Parcel
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ staggerChildren: 0.05 }}
              className="space-y-3 pt-1"
            >
              {filteredConversations.map((conv) => {
                const partnerName = getOtherParticipantName(conv)
                const isUnread = conv.last_message_read === false && conv.last_message_sender_id !== currentUserId

                return (
                  <Link
                    key={conv.id}
                    href={`/chat/${conv.id}`}
                    className="group block rounded-2xl p-4 sm:p-5 bg-surface/90 border border-border-subtle hover:border-primary/50 hover:shadow-[var(--shadow-bento)] hover:bg-surface-elevated/60 transition-all duration-300 relative overflow-hidden backdrop-blur-xs"
                  >
                    {/* Unread Glow Accent Bar */}
                    {isUnread && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary to-emerald-400 shadow-[0_0_12px_rgba(5,150,105,0.6)]" />
                    )}

                    <div className="flex items-center justify-between gap-4">
                      {/* Left: Avatar & Details */}
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/20 via-primary/10 to-primary/5 text-primary flex items-center justify-center font-heading font-bold text-base border border-primary/25 shadow-xs group-hover:scale-105 group-hover:shadow-md transition-all duration-300">
                            {partnerName.charAt(0).toUpperCase()}
                          </div>
                          {isUnread ? (
                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary rounded-full ring-2 ring-surface shadow-xs animate-pulse" />
                          ) : (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-surface" />
                          )}
                        </div>

                        {/* Text Block */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-heading font-bold text-foreground truncate group-hover:text-primary transition-colors">
                              {partnerName}
                            </h3>

                            {conv.route && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-primary-subtle/80 text-primary border border-primary/20">
                                <Route className="w-3 h-3" />
                                {conv.route}
                              </span>
                            )}
                          </div>

                          {conv.parcel_description && (
                            <div className="flex items-center gap-1.5 text-xs text-muted truncate">
                              <Package className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                              <span className="truncate font-medium text-foreground/80">{conv.parcel_description}</span>
                            </div>
                          )}

                          {conv.last_message_text ? (
                            <p className="text-xs text-muted line-clamp-1 group-hover:text-foreground/90 transition-colors">
                              {conv.last_message_text}
                            </p>
                          ) : (
                            <p className="text-xs italic text-muted/70">
                              Journey conversation open. Tap to coordinate departure and exchange golden passkeys.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Timestamp & Action */}
                      <div className="flex flex-col items-end justify-between self-stretch shrink-0 gap-2">
                        <span className="text-[11px] font-medium text-muted bg-surface-elevated/80 px-2 py-0.5 rounded-md border border-border-subtle/60">
                          {formatTimestamp(conv.last_message_at)}
                        </span>

                        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform mt-auto">
                          <span className="hidden sm:inline text-[11px]">Coordinate</span>
                          <div className="w-6 h-6 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-colors">
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </motion.div>
          )}
        </div>
      </div>
    </MarketingShell>
  )
}
