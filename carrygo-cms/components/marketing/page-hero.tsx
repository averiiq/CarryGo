import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Reveal } from '@/components/marketing/animated-reveal'

type HeroAction = {
  label: string
  href: string
  variant?: 'primary' | 'secondary'
}

type PageHeroProps = {
  badge: string
  title: string
  description: string
  actions: HeroAction[]
  illustrationSrc?: string
  illustrationAlt?: string
  illustrationLabel?: string
}

export function PageHero({
  badge,
  title,
  description,
  actions,
  illustrationSrc,
  illustrationAlt = 'CarryGo visual',
  illustrationLabel,
}: PageHeroProps) {
  const isSvg = illustrationSrc?.endsWith('.svg')

  return (
    <div className='mx-auto grid w-full max-w-7xl gap-10 md:gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center'>
      <Reveal className='text-center lg:text-left'>
        <div className='badge-pill'>
          {badge}
        </div>

        <h1 className='mt-6 max-w-3xl text-[clamp(2rem,5.4vw,4.35rem)] font-heading font-bold leading-[1.08] tracking-tight text-foreground lg:mx-0'>
          {title}
        </h1>

        <p className='mx-auto mt-5 max-w-2xl text-[1.02rem] leading-relaxed text-muted md:text-lg lg:mx-0'>
          {description}
        </p>

        <div className='mt-8 flex flex-wrap items-stretch justify-center gap-3 sm:items-center lg:justify-start'>
          {actions.map((action) => {
            const isPrimary = action.variant !== 'secondary'

            return (
              <Link
                key={action.href}
                href={action.href}
                className={
                  isPrimary
                    ? 'button-primary group w-full justify-center sm:w-auto'
                    : 'button-secondary group w-full justify-center sm:w-auto'
                }
              >
                {action.label}
                {isPrimary && <ArrowRight className='h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5' />}
              </Link>
            )
          })}
        </div>
      </Reveal>

      {illustrationSrc && (
        <Reveal delay={0.08} className='relative'>
          <div aria-hidden className='pointer-events-none absolute inset-6 rounded-[1.9rem] bg-primary-subtle blur-2xl' />
          <div className='relative overflow-hidden rounded-3xl border border-border/70 bg-surface p-3 shadow-sm md:p-4'>
            <Image
              src={illustrationSrc}
              alt={illustrationAlt}
              width={960}
              height={720}
              className={isSvg ? 'relative z-10 h-auto w-full rounded-2xl' : 'relative z-10 aspect-[4/3] w-full rounded-2xl object-cover'}
            />
          </div>

          {illustrationLabel && (
            <div className='mt-3 inline-flex rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-muted shadow-xs'>
              {illustrationLabel}
            </div>
          )}
        </Reveal>
      )}
    </div>
  )
}
