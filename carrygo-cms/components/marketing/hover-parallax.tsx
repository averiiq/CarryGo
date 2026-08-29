'use client'

import type { MouseEvent, ReactNode } from 'react'
import { useRef } from 'react'
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'
import { activeMotionPresetConfig } from '@/components/marketing/motion-presets'

type HoverParallaxProps = {
  children: ReactNode
  className?: string
  rotate?: number
}

export function HoverParallax({ children, className, rotate }: HoverParallaxProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  const appliedRotate = rotate ?? activeMotionPresetConfig.parallaxRotate

  const rotateXValue = useMotionValue(0)
  const rotateYValue = useMotionValue(0)
  const glowX = useMotionValue(0)
  const glowY = useMotionValue(0)

  const rotateX = useSpring(rotateXValue, {
    stiffness: activeMotionPresetConfig.parallaxStiffness,
    damping: activeMotionPresetConfig.parallaxDamping,
    mass: activeMotionPresetConfig.parallaxMass,
  })
  const rotateY = useSpring(rotateYValue, {
    stiffness: activeMotionPresetConfig.parallaxStiffness,
    damping: activeMotionPresetConfig.parallaxDamping,
    mass: activeMotionPresetConfig.parallaxMass,
  })

  const glow = useMotionTemplate`radial-gradient(220px circle at ${glowX}px ${glowY}px, rgba(255,255,255,${activeMotionPresetConfig.glowOpacity}), rgba(255,255,255,0))`

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) {
      return
    }

    const element = cardRef.current
    if (!element) {
      return
    }

    const rect = element.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height

    const ry = (px - 0.5) * appliedRotate * 2
    const rx = (0.5 - py) * appliedRotate * 2

    rotateXValue.set(rx)
    rotateYValue.set(ry)
    glowX.set(event.clientX - rect.left)
    glowY.set(event.clientY - rect.top)
  }

  const handleLeave = () => {
    rotateXValue.set(0)
    rotateYValue.set(0)
  }

  return (
    <motion.div
      ref={cardRef}
      className={`group ${className ?? ''}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        rotateX: reduceMotion ? 0 : rotateX,
        rotateY: reduceMotion ? 0 : rotateY,
        transformStyle: 'preserve-3d',
        transformPerspective: 1000,
        willChange: 'transform',
      }}
      transition={{ type: 'spring', stiffness: activeMotionPresetConfig.parallaxStiffness, damping: activeMotionPresetConfig.parallaxDamping }}
    >
      {children}
      {!reduceMotion && (
        <motion.div
          aria-hidden
          className='pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100'
          style={{ backgroundImage: glow }}
        />
      )}
    </motion.div>
  )
}
