type SectionHeadingProps = {
  label: string
  title: string
  description: string
  centered?: boolean
}

export function SectionHeading({ label, title, description, centered = true }: SectionHeadingProps) {
  return (
    <div className={centered ? 'mx-auto max-w-3xl space-y-4 text-center' : 'max-w-3xl space-y-4'}>
      <p className='inline-flex rounded-full border border-primary/15 bg-primary-subtle px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary'>
        {label}
      </p>
      <h2 className='text-[clamp(1.9rem,3.8vw,2.7rem)] font-heading font-bold leading-[1.12] tracking-tight text-foreground'>
        {title}
      </h2>
      <p className='mx-auto max-w-2xl text-base leading-relaxed text-muted md:text-lg'>
        {description}
      </p>
    </div>
  )
}
