import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { HoverParallax } from '@/components/marketing/hover-parallax'
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
    <div className='mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center'>
      <Reveal className='text-center lg:text-left'>
        <div className='premium-gradient-pill inline-flex items-center rounded-full border border-primary/20 px-4 py-1.5 text-sm font-medium text-primary'>
          {badge}
        </div>
        <h1 className='mt-6 text-[clamp(2.2rem,6vw,4.5rem)] font-heading font-bold leading-tight tracking-tight text-foreground'>
          {title}
        </h1>
        <p className='mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-xl lg:mx-0'>{description}</p>

        <div className='mt-9 flex flex-wrap items-center justify-center gap-3 lg:justify-start'>
          {actions.map((action) => {
            const isPrimary = action.variant !== 'secondary'

            return (
              <Link
                key={action.href}
                href={action.href}
                className={
                  isPrimary
                    ? 'premium-cta-gradient group inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl'
                    : 'inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-6 py-3.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:text-primary'
                }
              >
                {action.label}
                {isPrimary && <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />}
              </Link>
            )
          })}
        </div>
      </Reveal>

      {illustrationSrc && (
        <Reveal delay={0.12} className='relative'>
          <HoverParallax className='relative'>
            <div className='premium-gradient-card relative overflow-hidden rounded-3xl border border-border/70 p-3 shadow-2xl shadow-primary/10 md:p-4'>
              <div className='absolute inset-x-14 -top-24 h-40 rounded-full bg-primary/20 blur-3xl' />
              <Image
                src={illustrationSrc}
                alt={illustrationAlt}
                width={960}
                height={720}
                className={
                  isSvg
                    ? 'relative z-10 h-auto w-full animate-float rounded-2xl'
                    : 'relative z-10 aspect-[4/3] w-full rounded-2xl object-cover transition-transform duration-700 group-hover:scale-[1.025]'
                }
              />
            </div>
          </HoverParallax>
          {illustrationLabel && (
            <div className='absolute -bottom-4 left-6 rounded-full border border-border bg-background/95 px-4 py-2 text-xs font-medium text-muted shadow-md backdrop-blur'>
              {illustrationLabel}
            </div>
          )}
        </Reveal>
      )}
    </div>
  )
}
