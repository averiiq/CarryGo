'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Clock,
  MessageCircle,
  MessageSquare,
  Package,
  Route,
  User,
} from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { createClient } from '@/utils/supabase/client'

interface ConversationSummary {
  id: string
  request_id: string
  route: string | null
  parcel_description: string | null
  last_message_text: string | null
  last_message_at: string | null
  last_message_sender_id: string | null
  participant_names?: Record<string, string>
}

export default function ChatInboxPage() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const loadInbox = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
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

  return (
    <MarketingShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-12">
        <div className="flex items-center justify-between border-b border-slate-200 pb-5 mb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-slate-900 tracking-tight">
              Messages &amp; Coordination
            </h1>
            <p className="text-xs text-slate-500">
              Direct real-time communication between senders and travelers for active requests.
            </p>
          </div>

          <Link
            href="/activity"
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            My Deliveries
          </Link>
        </div>

        {loading ? (
          <div className="glass-card rounded-2xl p-10 text-center text-xs text-slate-400">
            Loading conversations...
          </div>
        ) : conversations.length === 0 ? (
          <div className="glass-card rounded-3xl p-10 text-center border border-slate-200 bg-white space-y-3">
            <MessageCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Active Conversations</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Conversations start automatically when you send a booking request to a traveler or an offer to carry a parcel.
            </p>
            <Link
              href="/search"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
            >
              Search Open Shipments <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                className="glass-card block rounded-2xl p-4 sm:p-5 border border-slate-200 hover:border-emerald-300 hover:shadow-md transition bg-white/95 group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition">
                        {conv.route || 'Delivery Coordination'}
                      </h3>
                      {conv.parcel_description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{conv.parcel_description}</p>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400 shrink-0">
                    {conv.last_message_at
                      ? new Date(conv.last_message_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </span>
                </div>

                {conv.last_message_text && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <p className="line-clamp-1 italic text-slate-500">
                      &ldquo;{conv.last_message_text}&rdquo;
                    </p>
                    <span className="text-emerald-600 font-semibold text-[11px] shrink-0 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Open <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </MarketingShell>
  )
}
