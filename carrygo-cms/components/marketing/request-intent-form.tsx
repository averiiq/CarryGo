'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, MessageCircle, Send } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type Props =
  | { mode: 'trip'; tripId: string; suggestedPrice: number }
  | { mode: 'parcel'; parcelId: string; suggestedPrice: number }

type Notice = { type: 'error' | 'success'; message: string } | null

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function extractId(value: unknown): string | null {
  if (!value) return null
  if (Array.isArray(value)) return extractId(value[0])
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'string' ? id : null
  }
  return null
}

export function RequestIntentForm(props: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)

  const [counterpartId, setCounterpartId] = useState('')
  const [price, setPrice] = useState(String(Math.max(1, Math.round(props.suggestedPrice || 100))))
  const [message, setMessage] = useState('')

  const counterpartLabel = props.mode === 'trip' ? 'Your Parcel ID' : 'Target Trip ID'
  const helperText =
    props.mode === 'trip'
      ? 'Paste the parcel UUID you want this traveler to carry.'
      : 'Paste the trip UUID you want to pair with this parcel.'

  async function handleSubmit() {
    setNotice(null)
    setConversationId(null)

    if (!UUID_REGEX.test(counterpartId.trim())) {
      setNotice({ type: 'error', message: `${counterpartLabel} must be a valid UUID.` })
      return
    }

    const numericPrice = Number(price)
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setNotice({ type: 'error', message: 'Price must be a positive number.' })
      return
    }

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setNotice({ type: 'error', message: 'Please login first to create a request.' })
        return
      }

      const payload =
        props.mode === 'trip'
          ? {
              p_parcel_id: counterpartId.trim(),
              p_trip_id: props.tripId,
              p_price: numericPrice,
              p_message: message.trim() || null,
            }
          : {
              p_parcel_id: props.parcelId,
              p_trip_id: counterpartId.trim(),
              p_price: numericPrice,
              p_message: message.trim() || null,
            }

      const requestRes = await supabase.rpc('create_request_command', payload)

      if (requestRes.error) {
        setNotice({ type: 'error', message: requestRes.error.message })
        return
      }

      const requestId = extractId(requestRes.data)
      if (requestId) {
        const conversationRes = await supabase.rpc('create_conversation_for_request', {
          p_request_id: requestId,
        })

        if (!conversationRes.error) {
          const convId = extractId(conversationRes.data)
          if (convId) {
            setConversationId(convId)
          }
        }
      }

      setNotice({
        type: 'success',
        message: requestId
          ? 'Request created successfully.'
          : 'Request created, but request id was not returned by RPC payload.',
      })
      setCounterpartId('')
      setMessage('')
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to create request.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className='mt-3 rounded-xl border border-border bg-surface-elevated/70 p-3'>
      <button
        type='button'
        onClick={() => setIsOpen((open) => !open)}
        className='inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-hover'
      >
        <Send className='h-3.5 w-3.5' />
        {isOpen ? 'Hide Request Form' : 'Send Request'}
      </button>

      {isOpen && (
        <div className='mt-3 space-y-2.5'>
          <label className='space-y-1'>
            <span className='text-[11px] font-medium text-foreground'>{counterpartLabel}</span>
            <input
              value={counterpartId}
              onChange={(event) => setCounterpartId(event.target.value)}
              placeholder='xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
              className='w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-foreground outline-none transition focus:border-primary/45'
            />
          </label>

          <label className='space-y-1'>
            <span className='text-[11px] font-medium text-foreground'>Offer Price (₹)</span>
            <input
              type='number'
              min='1'
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className='w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-foreground outline-none transition focus:border-primary/45'
            />
          </label>

          <label className='space-y-1'>
            <span className='text-[11px] font-medium text-foreground'>Message (optional)</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={500}
              className='min-h-[72px] w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-foreground outline-none transition focus:border-primary/45'
              placeholder='Add handling notes or coordination message.'
            />
          </label>

          <p className='text-[10px] text-muted'>{helperText}</p>

          {notice && (
            <p
              className={`rounded-lg border px-2 py-1.5 text-[11px] ${
                notice.type === 'success'
                  ? 'border-success/35 bg-success-subtle text-success'
                  : 'border-danger/35 bg-danger-subtle text-danger'
              }`}
            >
              {notice.message}
            </p>
          )}

          {conversationId && (
            <Link
              href={`/chat/${conversationId}`}
              className='inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary-subtle px-3 py-2 text-xs font-medium text-primary hover:bg-primary/15'
            >
              <MessageCircle className='h-3.5 w-3.5' />
              Open Chat
            </Link>
          )}

          <button
            type='button'
            onClick={handleSubmit}
            disabled={isSubmitting}
            className='inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-70'
          >
            {isSubmitting ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Send className='h-3.5 w-3.5' />}
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      )}
    </div>
  )
}
