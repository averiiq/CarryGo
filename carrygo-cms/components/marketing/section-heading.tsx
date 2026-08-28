type SectionHeadingProps = {
  label: string
  title: string
  description: string
  centered?: boolean
}

export function SectionHeading({ label, title, description, centered = true }: SectionHeadingProps) {
  return (
    <div className={centered ? 'mx-auto max-w-3xl space-y-4 text-center' : 'max-w-3xl space-y-4'}>
      <p className='text-sm font-semibold uppercase tracking-[0.2em] text-primary'>{label}</p>
      <h2 className='text-3xl font-heading font-bold tracking-tight text-foreground md:text-4xl'>{title}</h2>
      <p className='text-base leading-relaxed text-muted md:text-lg'>{description}</p>
    </div>
  )
}
