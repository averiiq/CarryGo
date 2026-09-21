'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, SendHorizonal, ShieldCheck } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type Message = {
  id: string
  sender_id: string
  sender_name: string
  text: string
  created_at: string
}

type Conversation = {
  id: string
  route: string | null
  parcel_description: string | null
  participant_ids: string[] | null
}

type Props = {
  conversationId: string
}

export function ChatThread({ conversationId }: Props) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string>('Me')
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadThread = useCallback(async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('Please sign in to access this conversation.')
        setIsLoading(false)
        return
      }

      setCurrentUserId(user.id)
      setCurrentUserName((user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'User')

      const [conversationRes, messagesRes] = await Promise.all([
        supabase
          .from('conversations')
          .select('id, route, parcel_description, participant_ids')
          .eq('id', conversationId)
          .maybeSingle(),
        supabase
          .from('messages')
          .select('id, sender_id, sender_name, text, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true }),
      ])

      if (conversationRes.error) {
        setError(conversationRes.error.message)
        setIsLoading(false)
        return
      }
      if (messagesRes.error) {
        setError(messagesRes.error.message)
        setIsLoading(false)
        return
      }

      setConversation(conversationRes.data as Conversation)
      setMessages((messagesRes.data ?? []) as Message[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load chat')
    } finally {
      setIsLoading(false)
    }
  }, [conversationId])

  useEffect(() => {
    void loadThread()
  }, [loadThread])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Real-time message subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [conversationId])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = input.trim()
    if (!text) return

    setIsSending(true)
    setError(null)

    try {
      const supabase = createClient()

      // Try RPC first if available, or direct insert
      const { data, error: rpcError } = await supabase.rpc('send_chat_message_command', {
        p_conversation_id: conversationId,
        p_text: text,
      })

      if (rpcError) {
        // Fallback: direct table insert
        const { error: insertError } = await supabase.from('messages').insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          sender_name: currentUserName,
          text,
        })
        if (insertError) throw insertError
      }

      // Update conversation's last message
      await supabase
        .from('conversations')
        .update({
          last_message_text: text,
          last_message_sender_id: currentUserId,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

      setInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message')
    } finally {
      setIsSending(false)
    }
  }

  const title = useMemo(() => {
    if (!conversation) return 'Conversation'
    return conversation.route || conversation.parcel_description || 'Conversation'
  }, [conversation])

  return (
    <section className="glass-card mx-auto w-full max-w-4xl rounded-3xl p-5 md:p-6 border border-slate-200 bg-white/95 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-base sm:text-lg font-heading font-bold text-slate-900">{title}</h2>
            {conversation?.parcel_description && (
              <p className="text-xs text-slate-500 line-clamp-1">{conversation.parcel_description}</p>
            )}
          </div>
        </div>

        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5" /> End-to-End Escrow
        </span>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
          Loading secure conversation history...
        </div>
      ) : (
        <>
          <div className="max-h-[480px] min-h-[300px] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            {messages.length === 0 ? (
              <div className="py-12 text-center space-y-1">
                <p className="text-xs font-semibold text-slate-600">No messages yet.</p>
                <p className="text-[11px] text-slate-400">Say hello and coordinate pickup/delivery timing.</p>
              </div>
            ) : (
              messages.map((message) => {
                const mine = currentUserId && message.sender_id === currentUserId
                return (
                  <div
                    key={message.id}
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-xs ${
                      mine
                        ? 'ml-auto bg-emerald-600 text-white rounded-tr-none'
                        : 'mr-auto bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 mb-0.5 font-semibold">
                      <span>{mine ? 'You' : message.sender_name}</span>
                      <span>
                        {new Date(message.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="leading-relaxed break-words">{message.text}</p>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={onSubmit} className="flex items-center gap-2 pt-1">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type message to coordinate delivery..."
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs sm:text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-3 text-xs sm:text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Send</span>
                  <SendHorizonal className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
        </>
      )}
    </section>
  )
}
