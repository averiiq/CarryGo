type SectionHeadingProps = {
  label: string
  title: string
  description: string
  centered?: boolean
}

export function SectionHeading({ label, title, description, centered = true }: SectionHeadingProps) {
  return (
    <div className={centered ? 'mx-auto max-w-3xl space-y-3 text-center md:space-y-4' : 'max-w-3xl space-y-3 md:space-y-4'}>
      <p className='badge-pill'>
        {label}
      </p>
      <h2 className='text-[clamp(1.8rem,3.8vw,2.7rem)] font-heading font-bold leading-[1.12] tracking-tight text-foreground'>
        {title}
      </h2>
      <p className={centered ? 'mx-auto max-w-2xl text-[0.98rem] leading-relaxed text-muted md:text-lg' : 'max-w-2xl text-[0.98rem] leading-relaxed text-muted md:text-lg'}>
        {description}
      </p>
    </div>
  )
}
