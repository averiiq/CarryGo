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

        <h1 className='mt-6 max-w-3xl text-[clamp(1.85rem,5vw,4.25rem)] font-heading font-bold leading-[1.1] tracking-tight text-foreground lg:mx-0'>
          {title}
        </h1>

        <p className='mx-auto mt-4 sm:mt-5 max-w-2xl text-[0.95rem] sm:text-[1.02rem] leading-relaxed text-muted md:text-lg lg:mx-0'>
          {description}
        </p>

        <div className='mt-7 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3'>
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
        <Reveal delay={0.08} className='relative group'>
          {/* Ambient Volumetric Backlight */}
          <div aria-hidden className='pointer-events-none absolute -inset-4 rounded-[2.5rem] bg-gradient-to-tr from-emerald-500/15 via-sky-500/15 to-transparent blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-70' />
          
          {/* Framed 3D Visual Card */}
          <div className='relative overflow-hidden rounded-3xl border border-border/80 bg-surface/90 p-2 sm:p-3 shadow-bento backdrop-blur-xl transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-glow'>
            <div className='relative overflow-hidden rounded-2xl'>
              <Image
                src={illustrationSrc}
                alt={illustrationAlt}
                width={960}
                height={720}
                priority
                className={
                  isSvg
                    ? 'relative z-10 h-auto w-full rounded-2xl transition-transform duration-500 group-hover:scale-[1.02]'
                    : 'relative z-10 aspect-[16/10] w-full rounded-2xl object-contain bg-gradient-to-b from-white via-slate-50/50 to-slate-100/30 p-6 sm:p-10 transition-transform duration-500 group-hover:scale-[1.02]'
                }
              />
              <div className='pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5' />
            </div>
          </div>

          {illustrationLabel && (
            <div className='mt-3 flex items-center justify-between px-1'>
              <div className='inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface/90 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-xs backdrop-blur-md'>
                <span className='h-2 w-2 rounded-full bg-emerald-500 animate-pulse' />
                <span>{illustrationLabel}</span>
              </div>
              <span className='text-[11px] font-mono text-muted uppercase tracking-wider'>
                Verified P2P Network
              </span>
            </div>
          )}
        </Reveal>
      )}
    </div>
  )
}
