'use client'

import type { ReactNode } from 'react'
import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { activeMotionPresetConfig } from '@/components/marketing/motion-presets'

type ScrollLinkedSectionProps = {
  children: ReactNode
  className?: string
  intensity?: number
}

export function ScrollLinkedSection({ children, className, intensity }: ScrollLinkedSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()
  const appliedIntensity = intensity ?? activeMotionPresetConfig.scrollIntensity

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  const yRaw = useTransform(scrollYProgress, [0, 0.5, 1], [appliedIntensity, 0, -appliedIntensity])
  const opacityRaw = useTransform(scrollYProgress, [0, 0.16, 0.84, 1], [0.35, 1, 1, 0.45])
  const scaleRaw = useTransform(scrollYProgress, [0, 0.5, 1], [0.98, 1, 0.985])

  const y = useSpring(yRaw, { stiffness: 110, damping: 28, mass: 0.32 })
  const opacity = useSpring(opacityRaw, { stiffness: 110, damping: 30, mass: 0.32 })
  const scale = useSpring(scaleRaw, { stiffness: 110, damping: 28, mass: 0.32 })

  return (
    <motion.section
      ref={sectionRef}
      className={className}
      style={
        reduceMotion
          ? undefined
          : {
              y,
              opacity,
              scale,
            }
      }
    >
      {children}
    </motion.section>
  )
}
