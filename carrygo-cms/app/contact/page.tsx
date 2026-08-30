import Link from 'next/link'
import { Mail, MessageSquareHeart, Phone, Sparkles } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata('Contact', 'Contact CarryGo for support, partnerships, and onboarding assistance.', '/contact')

const channels = [
  {
    title: 'Email Support',
    detail: 'support@carrygo.in',
    description: 'For account support, delivery issues, and policy queries.',
    href: 'mailto:support@carrygo.in',
    icon: Mail,
  },
  {
    title: 'Business Inquiries',
    detail: 'Partnership and enterprise setup',
    description: 'For operations partnerships, recurring route planning, and team onboarding.',
    href: 'mailto:support@carrygo.in?subject=CarryGo%20Business%20Inquiry',
    icon: MessageSquareHeart,
  },
  {
    title: 'Priority Assistance',
    detail: 'Response target: within 1 business day',
    description: 'For active shipment incidents and urgent escalation support.',
    href: 'mailto:support@carrygo.in?subject=Urgent%20CarryGo%20Support',
    icon: Phone,
  },
]

export default function ContactPage() {
  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-6 py-16 md:py-24'>
        <PageHero
          badge='Contact'
          title='Talk to the CarryGo Team'
          description='Whether you need support, sales guidance, or partnership planning, our team is ready to help.'
          illustrationSrc='/images/custom/support-center.svg'
          illustrationAlt='Custom support center illustration'
          illustrationLabel='Fast onboarding and support'
          actions={[
            { label: 'Email Support', href: 'mailto:support@carrygo.in' },
            { label: 'Browse FAQ', href: '/faq', variant: 'secondary' },
          ]}
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 md:grid-cols-3'>
          {channels.map((channel) => (
            <article key={channel.title} className='glass-card p-6 md:p-7'>
              <div className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-subtle text-primary'>
                <channel.icon className='h-5 w-5' />
              </div>
              <h3 className='mt-4 text-lg font-heading font-semibold text-foreground'>{channel.title}</h3>
              <p className='mt-1 text-sm font-medium text-foreground/80'>{channel.detail}</p>
              <p className='mt-2 text-sm leading-relaxed text-muted'>{channel.description}</p>
              <Link href={channel.href} className='inline-link mt-4'>
                Reach out
              </Link>
            </article>
          ))}
        </div>

        <article className='glass-card mx-auto mt-8 w-full max-w-6xl p-6 md:p-8'>
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div>
              <p className='badge-pill'>Need a guided rollout?</p>
              <h2 className='mt-2 text-2xl font-heading font-bold tracking-tight text-foreground'>Let us help you set up a professional delivery workflow</h2>
              <p className='mt-2 text-sm text-muted'>
                We support onboarding for frequent shippers and operations teams that need reliable route execution.
              </p>
            </div>
            <Link
              href='mailto:support@carrygo.in?subject=CarryGo%20Onboarding%20Support'
              className='button-primary'
            >
              <Sparkles className='h-4 w-4' />
              Request Onboarding
            </Link>
          </div>
        </article>
      </ScrollLinkedSection>
    </MarketingShell>
  )
}







