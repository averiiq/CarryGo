'use client'

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { activeMotionPresetConfig } from '@/components/marketing/motion-presets'

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  x?: number
  duration?: number
  direction?: 'up' | 'down' | 'left' | 'right'
}

export function Reveal({
  children,
  className,
  delay = 0,
  y,
  x,
  duration,
  direction = 'up',
}: RevealProps) {
  const reduceMotion = useReducedMotion()
  const baseDistance = activeMotionPresetConfig.revealDistance || 24
  const appliedDuration = duration ?? activeMotionPresetConfig.revealDuration ?? 0.6

  let initialY = y ?? (direction === 'up' ? baseDistance : direction === 'down' ? -baseDistance : 0)
  let initialX = x ?? (direction === 'left' ? baseDistance : direction === 'right' ? -baseDistance : 0)

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: initialY, x: initialX, filter: 'blur(5px)' }}
      whileInView={{ opacity: 1, y: 0, x: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{
        duration: appliedDuration,
        ease: [0.21, 0.47, 0.32, 0.98],
        delay,
      }}
      className={`will-change-transform ${className || ''}`}
    >
      {children}
    </motion.div>
  )
}
