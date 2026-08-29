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
    <div className='mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center'>
      <Reveal className='text-center lg:text-left'>
        <div className='inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary'>
          {badge}
        </div>

        <h1 className='mt-6 max-w-3xl text-[clamp(2.15rem,5.6vw,4.35rem)] font-heading font-bold leading-[1.08] tracking-tight text-foreground lg:mx-0'>
          {title}
        </h1>

        <p className='mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-lg lg:mx-0'>
          {description}
        </p>

        <div className='mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start'>
          {actions.map((action) => {
            const isPrimary = action.variant !== 'secondary'

            return (
              <Link
                key={action.href}
                href={action.href}
                className={
                  isPrimary
                    ? 'inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover'
                    : 'inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary/35 hover:text-primary'
                }
              >
                {action.label}
                {isPrimary && <ArrowRight className='h-4 w-4' />}
              </Link>
            )
          })}
        </div>
      </Reveal>

      {illustrationSrc && (
        <Reveal delay={0.08} className='relative'>
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
