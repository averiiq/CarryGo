'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ImagePlus, Loader2, SendHorizonal, ShieldCheck } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { fileToBlob, uploadBlobToCloudinary } from '@/services/storage.service'

const IMAGE_URL_PATTERN =
  /^https?:\/\/[^\s]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s]*)?$/i

function extractImageUrl(text: string): string | null {
  const trimmed = text.trim()
  if (trimmed.startsWith('[img]')) return trimmed.slice(5).trim() || null
  if (IMAGE_URL_PATTERN.test(trimmed)) return trimmed
  return null
}

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
  request_id: string | null
}

type DeliveryContext = {
  requestId: string
  status: string
  price: number | null
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
  const [deliveryContext, setDeliveryContext] = useState<DeliveryContext | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
          .select('id, route, parcel_description, participant_ids, request_id')
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

      const conv = conversationRes.data as Conversation
      setConversation(conv)
      setMessages((messagesRes.data ?? []) as Message[])
      setError(null)

      // Fetch linked request for delivery context pill
      if (conv?.request_id) {
        const { data: req } = await supabase
          .from('requests')
          .select('id, status, price')
          .eq('id', conv.request_id)
          .maybeSingle()
        if (req) {
          setDeliveryContext({
            requestId: req.id as string,
            status: req.status as string,
            price: (req.price as number | null) ?? null,
          })
        }
      }
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

    let cancelled = false
    return () => {
      cancelled = true
      // Await the unsubscribe so a fast remount doesn't leave orphan channels.
      void (async () => {
        try {
          await supabase.removeChannel(channel)
        } catch {
          // No-op: cleanup best-effort; cancelled guard prevents re-entry.
        }
        void cancelled
      })()
    }
  }, [conversationId])

  const sendText = async (textBody: string) => {
    const supabase = createClient()
    const { error: rpcError } = await supabase.rpc('send_chat_message_command', {
      p_conversation_id: conversationId,
      p_text: textBody,
    })
    if (rpcError) {
      const { error: insertError } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        sender_name: currentUserName,
        text: textBody,
      })
      if (insertError) throw insertError
    }
    await supabase
      .from('conversations')
      .update({
        last_message_text: textBody,
        last_message_sender_id: currentUserId,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = input.trim()
    if (!text) return
    setIsSending(true)
    setError(null)
    try {
      await sendText(text)
      setInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message')
    } finally {
      setIsSending(false)
    }
  }

  async function onAttachImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !currentUserId) return
    if (file.size > 10 * 1024 * 1024) {
      setError('Image is too large (max 10 MB).')
      return
    }
    setIsUploadingImage(true)
    setError(null)
    try {
      const uploaded = await uploadBlobToCloudinary(
        fileToBlob(file),
        'chat-attachments',
        currentUserId,
        `msg_${Date.now()}`,
      )
      await sendText(`[img]${uploaded.cdnUrl}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image send failed.')
    } finally {
      setIsUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
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

        <div className="flex items-center gap-1.5">
          {deliveryContext && (
            <Link
              href={`/delivery/${deliveryContext.requestId}`}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 hover:bg-indigo-100 transition"
              title="Open delivery tracking"
            >
              <span className="uppercase tracking-wider">{deliveryContext.status.replace(/_/g, ' ')}</span>
              {deliveryContext.price != null && <span>· ₹{deliveryContext.price}</span>}
            </Link>
          )}
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" /> Secured
          </span>
        </div>
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
                const imageUrl = extractImageUrl(message.text)
                return (
                  <div
                    key={message.id}
                    className={`max-w-[80%] rounded-2xl ${
                      imageUrl ? 'p-1.5' : 'px-4 py-2.5'
                    } text-xs sm:text-sm shadow-xs ${
                      mine
                        ? 'ml-auto bg-emerald-600 text-white rounded-tr-none'
                        : 'mr-auto bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                    }`}
                  >
                    <div className={`flex items-center justify-between gap-3 text-[10px] opacity-75 ${imageUrl ? 'px-2 pt-1' : 'mb-0.5'} font-semibold`}>
                      <span>{mine ? 'You' : message.sender_name}</span>
                      <span>
                        {new Date(message.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageUrl}
                        alt="attachment"
                        className="mt-1 max-w-full max-h-72 rounded-xl object-cover"
                      />
                    ) : (
                      <p className="leading-relaxed break-words">{message.text}</p>
                    )}
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={onSubmit} className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingImage}
              className="shrink-0 w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-emerald-700 hover:border-emerald-300 flex items-center justify-center disabled:opacity-50"
              aria-label="Attach image"
              title="Attach image"
            >
              {isUploadingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onAttachImage(e)}
            />
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
