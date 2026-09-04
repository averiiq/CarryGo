import { MessageCircle } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { ChatThread } from '@/components/chat/chat-thread'
import { createMarketingMetadata } from '@/lib/marketing-metadata'
import { isValidUuid } from '@/lib/validation'

export const metadata = createMarketingMetadata(
  'Chat',
  'Coordinate request details in web chat.',
  '/chat'
)

type Props = {
  params: Promise<{ id: string }>
}

export default async function ChatPage({ params }: Props) {
  const { id } = await params

  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-6 pt-16 pb-10 md:pt-24 md:pb-12'>
        <PageHero
          badge='Phase 2: Chat Handoff'
          title='Request Conversation'
          description='Continue coordination in chat right after creating a request.'
          illustrationSrc='/images/custom/support-center.svg'
          illustrationAlt='Chat support illustration'
          illustrationLabel='Real-time coordination'
          actions={[
            { label: 'Back to Search', href: '/search' },
            { label: 'Create Trip', href: '/create-trip', variant: 'secondary' },
          ]}
        />
      </ScrollLinkedSection>

      <ScrollLinkedSection className='px-6 pb-24 md:pb-28'>
        {isValidUuid(id) ? (
          <ChatThread conversationId={id} />
        ) : (
          <section className='glass-card mx-auto w-full max-w-3xl rounded-3xl p-6 text-center'>
            <MessageCircle className='mx-auto h-6 w-6 text-danger' />
            <h2 className='mt-2 text-lg font-heading font-semibold text-foreground'>Invalid chat id</h2>
            <p className='mt-1 text-sm text-muted'>Please open chat from a request card after successful request creation.</p>
          </section>
        )}
      </ScrollLinkedSection>
    </MarketingShell>
  )
}
