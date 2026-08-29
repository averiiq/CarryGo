import type { ReactNode } from 'react'

type ScrollLinkedSectionProps = {
  children: ReactNode
  className?: string
}

export function ScrollLinkedSection({ children, className }: ScrollLinkedSectionProps) {
  return <section className={className}>{children}</section>
}
