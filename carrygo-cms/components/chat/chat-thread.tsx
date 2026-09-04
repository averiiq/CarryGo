'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Loader2, SendHorizonal } from 'lucide-react'
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
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])

  async function loadThread() {
    setError(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('Please login to access chat.')
        return
      }

      setCurrentUserId(user.id)

      const [conversationRes, messagesRes] = await Promise.all([
        supabase
          .from('conversations')
          .select('id, route, parcel_description, participant_ids')
          .eq('id', conversationId)
          .single(),
        supabase
          .from('messages')
          .select('id, sender_id, sender_name, text, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true }),
      ])

      if (conversationRes.error) {
        setError(conversationRes.error.message)
        return
      }
      if (messagesRes.error) {
        setError(messagesRes.error.message)
        return
      }

      setConversation(conversationRes.data as Conversation)
      setMessages((messagesRes.data ?? []) as Message[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load chat')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadThread()
  }, [conversationId])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = input.trim()
    if (!text) return

    setIsSending(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: rpcError } = await supabase.rpc('send_chat_message_command', {
        p_conversation_id: conversationId,
        p_text: text,
      })

      if (rpcError) {
        setError(rpcError.message)
        return
      }

      const row = Array.isArray(data) ? data[0] : data
      if (row && typeof row === 'object') {
        setMessages((prev) => [
          ...prev,
          {
            id: String((row as { id?: string }).id ?? crypto.randomUUID()),
            sender_id: String((row as { sender_id?: string }).sender_id ?? currentUserId ?? ''),
            sender_name: String((row as { sender_name?: string }).sender_name ?? 'You'),
            text: String((row as { text?: string }).text ?? text),
            created_at: String((row as { created_at?: string }).created_at ?? new Date().toISOString()),
          },
        ])
      } else {
        void loadThread()
      }

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
    <section className='glass-card mx-auto w-full max-w-4xl rounded-3xl p-5 md:p-6'>
      <h2 className='text-xl font-heading font-semibold text-foreground'>{title}</h2>

      {error && (
        <p className='mt-3 rounded-lg border border-danger/35 bg-danger-subtle px-3 py-2 text-sm text-danger'>
          {error}
        </p>
      )}

      {isLoading ? (
        <div className='mt-4 inline-flex items-center gap-2 text-sm text-muted'>
          <Loader2 className='h-4 w-4 animate-spin' />
          Loading messages...
        </div>
      ) : (
        <>
          <div className='mt-4 max-h-[420px] space-y-2 overflow-y-auto rounded-2xl border border-border bg-surface p-3'>
            {messages.length === 0 ? (
              <p className='text-sm text-muted'>No messages yet. Start the conversation.</p>
            ) : (
              messages.map((message) => {
                const mine = currentUserId && message.sender_id === currentUserId
                return (
                  <div
                    key={message.id}
                    className={`max-w-[88%] rounded-xl px-3 py-2 text-sm ${
                      mine
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : 'mr-auto bg-surface-elevated text-foreground border border-border'
                    }`}
                  >
                    <p className='text-[11px] opacity-80'>{mine ? 'You' : message.sender_name}</p>
                    <p className='mt-0.5'>{message.text}</p>
                  </div>
                )
              })
            )}
          </div>

          <form onSubmit={onSubmit} className='mt-3 flex items-center gap-2'>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder='Type your message...'
              className='w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-primary/45'
            />
            <button
              type='submit'
              disabled={isSending}
              className='inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-70'
            >
              {isSending ? <Loader2 className='h-4 w-4 animate-spin' /> : <SendHorizonal className='h-4 w-4' />}
              Send
            </button>
          </form>
        </>
      )}
    </section>
  )
}
