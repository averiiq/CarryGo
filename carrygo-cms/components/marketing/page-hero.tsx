import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

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
}

export function PageHero({ badge, title, description, actions }: PageHeroProps) {
  return (
    <div className='mx-auto max-w-4xl text-center'>
      <div className='inline-flex items-center rounded-full border border-primary/20 bg-primary-subtle px-4 py-1.5 text-sm font-medium text-primary'>
        {badge}
      </div>
      <h1 className='mt-6 text-[clamp(2.25rem,6vw,4.4rem)] font-heading font-bold leading-tight tracking-tight text-foreground'>
        {title}
      </h1>
      <p className='mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted md:text-xl'>{description}</p>

      <div className='mt-9 flex flex-wrap items-center justify-center gap-3'>
        {actions.map((action) => {
          const isPrimary = action.variant !== 'secondary'

          return (
            <Link
              key={action.href}
              href={action.href}
              className={
                isPrimary
                  ? 'group inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary-hover hover:shadow-xl'
                  : 'inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-6 py-3.5 text-sm font-semibold text-foreground transition-all hover:border-primary/35 hover:text-primary'
              }
            >
              {action.label}
              {isPrimary && <ArrowRight className='h-4 w-4 transition-transform group-hover:translate-x-0.5' />}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
