import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Reveal } from '@/components/marketing/animated-reveal'
import { ParallaxLayer } from '@/components/marketing/parallax-wrapper'

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

        <h1 className='mt-6 max-w-3xl text-[clamp(1.85rem,5vw,4.25rem)] font-heading font-extrabold leading-[1.12] tracking-tight text-slate-900 lg:mx-0'>
          {title}
        </h1>

        <p className='mx-auto mt-4 sm:mt-5 max-w-2xl text-[0.95rem] sm:text-[1.02rem] leading-relaxed text-slate-700 md:text-lg lg:mx-0 font-normal'>
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
                    ? 'button-primary group w-full justify-center sm:w-auto shadow-xs active:scale-95'
                    : 'button-secondary group w-full justify-center sm:w-auto active:scale-95'
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
        <ParallaxLayer speed={-0.1} className='relative group'>
          <Reveal delay={0.08}>
            {/* Ambient Volumetric Backlight */}
            <div aria-hidden className='pointer-events-none absolute -inset-4 rounded-[2.5rem] bg-gradient-to-tr from-emerald-500/12 via-sky-500/12 to-transparent blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-60' />
            
            {/* Framed Visual Card */}
            <div className='sturdy-card p-2 sm:p-3 relative overflow-hidden backdrop-blur-xl'>
              <div className='relative overflow-hidden rounded-2xl'>
                <Image
                  src={illustrationSrc}
                  alt={illustrationAlt}
                  width={960}
                  height={720}
                  priority
                  className={
                    isSvg
                      ? 'relative z-10 h-auto w-full rounded-2xl transition-transform duration-500 group-hover:scale-[1.01]'
                      : 'relative z-10 aspect-[16/10] w-full rounded-2xl object-contain bg-gradient-to-b from-white via-slate-50/50 to-slate-100/30 p-6 sm:p-10 transition-transform duration-500 group-hover:scale-[1.01]'
                  }
                />
                <div className='pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5' />
              </div>
            </div>

            {illustrationLabel && (
              <div className='mt-3 flex items-center justify-between px-1'>
                <div className='inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xs backdrop-blur-md'>
                  <span className='h-2 w-2 rounded-full bg-emerald-500 animate-pulse' />
                  <span>{illustrationLabel}</span>
                </div>
                <span className='text-[11px] font-mono text-slate-500 uppercase tracking-wider font-medium'>
                  Verified P2P Network
                </span>
              </div>
            )}
          </Reveal>
        </ParallaxLayer>
      )}
    </div>
  )
}
