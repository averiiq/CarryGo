'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { activeMotionPresetConfig } from '@/components/marketing/motion-presets'

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  duration?: number
}

export function Reveal({ children, className, delay = 0, y, duration }: RevealProps) {
  const reduceMotion = useReducedMotion()
  const appliedY = y ?? activeMotionPresetConfig.revealDistance
  const appliedDuration = duration ?? activeMotionPresetConfig.revealDuration

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={false}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: appliedDuration, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
