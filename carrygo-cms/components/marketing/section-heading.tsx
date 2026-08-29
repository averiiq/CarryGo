type SectionHeadingProps = {
  label: string
  title: string
  description: string
  centered?: boolean
}

export function SectionHeading({ label, title, description, centered = true }: SectionHeadingProps) {
  return (
    <div className={centered ? 'mx-auto max-w-3xl space-y-4 text-center' : 'max-w-3xl space-y-4'}>
      <p className='premium-gradient-pill inline-flex rounded-full border border-primary/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary'>
        {label}
      </p>
      <h2 className='text-3xl font-heading font-bold tracking-tight text-foreground md:text-4xl'>
        <span className='premium-text-gradient'>{title}</span>
      </h2>
      <p className='text-base leading-relaxed text-muted md:text-lg'>{description}</p>
    </div>
  )
}
