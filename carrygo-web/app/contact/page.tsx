import Link from 'next/link'
import { Mail, MessageSquareHeart, Phone, Sparkles, ShieldCheck, MapPin } from 'lucide-react'
import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollLinkedSection } from '@/components/marketing/scroll-linked-section'
import { createMarketingMetadata } from '@/lib/marketing-metadata'

export const metadata = createMarketingMetadata('Contact', 'Contact CaryGoo for support, partnerships, and onboarding assistance.', '/contact')

const channels = [
  {
    title: 'Email Support',
    detail: 'support@carygoo.in',
    description: 'For account support, delivery issues, and policy queries.',
    href: 'mailto:support@carygoo.in',
    icon: Mail,
  },
  {
    title: 'Business Inquiries',
    detail: 'Partnership and enterprise setup',
    description: 'For operations partnerships, recurring route planning, and team onboarding.',
    href: 'mailto:support@carygoo.in?subject=CaryGoo%20Business%20Inquiry',
    icon: MessageSquareHeart,
  },
  {
    title: 'Priority Assistance',
    detail: 'Response target: within 1 business day',
    description: 'For active shipment incidents and urgent escalation support.',
    href: 'mailto:support@carygoo.in?subject=Urgent%20CaryGoo%20Support',
    icon: Phone,
  },
]

export default function ContactPage() {
  return (
    <MarketingShell>
      <ScrollLinkedSection className='px-4 sm:px-6 py-16 md:py-24'>
        <PageHero
          badge='Contact'
          title='Talk to the CaryGoo Team'
          description='Whether you need support, sales guidance, or partnership planning, our team is ready to help.'
          illustrationSrc='/images/custom/support-center.svg'
          illustrationAlt='Custom support center illustration'
          illustrationLabel='Fast onboarding and support'
          actions={[
            { label: 'Email Support', href: 'mailto:support@carygoo.in' },
            { label: 'Browse FAQ', href: '/faq', variant: 'secondary' },
          ]}
        />

        <div className='mx-auto mt-12 grid w-full max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3 [&>*:last-child]:col-span-1 sm:[&>*:last-child]:col-span-2 lg:[&>*:last-child]:col-span-1'>
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

        {/* Statutory Compliance & Grievance Redressal */}
        <div className='mx-auto mt-8 grid w-full max-w-6xl gap-5 sm:grid-cols-2'>
          <article className='glass-card p-6 md:p-7'>
            <div className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-subtle text-primary'>
              <ShieldCheck className='h-5 w-5' />
            </div>
            <h3 className='mt-4 text-lg font-heading font-semibold text-foreground'>Grievance Redressal Officer</h3>
            <p className='mt-1 text-sm font-medium text-foreground/80'>grievance@carygoo.in</p>
            <p className='mt-2 text-sm leading-relaxed text-muted'>
              Under the Consumer Protection (E-Commerce) Rules, 2020 and Information Technology Rules, 2021, consumer grievances are acknowledged within 24 hours and redressed within 15 days.
            </p>
            <Link href='mailto:grievance@carygoo.in' className='inline-link mt-4'>
              File a Grievance
            </Link>
          </article>

          <article className='glass-card p-6 md:p-7'>
            <div className='inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary-subtle text-primary'>
              <MapPin className='h-5 w-5' />
            </div>
            <h3 className='mt-4 text-lg font-heading font-semibold text-foreground'>Registered Corporate Office</h3>
            <p className='mt-1 text-sm font-medium text-foreground/80'>CaryGoo Technologies Private Limited</p>
            <p className='mt-2 text-sm leading-relaxed text-muted'>
              Plot No. 44, Institutional Area, Sector 44, Gurugram, Haryana - 122003, India. CIN: U63090HR2026PTC109842.
            </p>
            <Link href='https://maps.google.com/?q=Sector+44+Gurugram+Haryana' target='_blank' rel='noopener noreferrer' className='inline-link mt-4'>
              View on Map
            </Link>
          </article>
        </div>

        <article className='glass-card mx-auto mt-8 w-full max-w-6xl p-5 sm:p-6 md:p-8'>
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div>
              <p className='badge-pill'>Need a guided rollout?</p>
              <h2 className='mt-2 text-xl sm:text-2xl font-heading font-bold tracking-tight text-foreground'>Let us help you set up a professional delivery workflow</h2>
              <p className='mt-2 text-sm text-muted'>
                We support onboarding for frequent shippers and operations teams that need reliable route execution.
              </p>
            </div>
            <Link
              href='mailto:support@carygoo.in?subject=CaryGoo%20Onboarding%20Support'
              className='button-primary w-full md:w-auto inline-flex items-center justify-center shrink-0'
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







