'use client'

import React, { useRef, type ReactNode } from 'react'
import { motion, useScroll, useTransform, useSpring, useReducedMotion } from 'framer-motion'

/**
 * ParallaxLayer:
 * Translates an element vertically or horizontally based on window/container scroll.
 * Uses spring physics for a silky smooth, jitter-free feeling.
 */
interface ParallaxLayerProps {
  children: ReactNode
  speed?: number // e.g. 0.15 (slower than scroll), -0.2 (reverse drift)
  className?: string
  offset?: ['start end', 'end start'] | ['start start', 'end start']
}

export function ParallaxLayer({
  children,
  speed = 0.15,
  className = '',
  offset = ['start end', 'end start'],
}: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset,
  })

  // Calculate pixel delta based on speed multiplier
  const distance = speed * 160
  const rawY = useTransform(scrollYProgress, [0, 1], [-distance, distance])
  const smoothY = useSpring(rawY, { stiffness: 120, damping: 24, mass: 0.2 })

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <div ref={ref} className={`relative will-change-transform ${className}`}>
      <motion.div style={{ y: smoothY }}>{children}</motion.div>
    </div>
  )
}

/**
 * ScrollExpandContainer:
 * Scales up gracefully (e.g. from 0.95 to 1.0) and softens border-radius
 * as the element enters the middle of the viewport.
 * Provides that signature Apple/Linear keynote feel.
 */
interface ScrollExpandProps {
  children: ReactNode
  className?: string
  innerClassName?: string
}

export function ScrollExpandContainer({
  children,
  className = '',
  innerClassName = '',
}: ScrollExpandProps) {
  const ref = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  })

  const rawScale = useTransform(scrollYProgress, [0, 1], [0.95, 1])
  const rawOpacity = useTransform(scrollYProgress, [0, 0.4, 1], [0.85, 0.95, 1])
  const smoothScale = useSpring(rawScale, { stiffness: 160, damping: 28, mass: 0.2 })
  const smoothOpacity = useSpring(rawOpacity, { stiffness: 160, damping: 28, mass: 0.2 })

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <div ref={ref} className={`relative will-change-transform ${className}`}>
      <motion.div
        style={{ scale: smoothScale, opacity: smoothOpacity }}
        className={innerClassName}
      >
        {children}
      </motion.div>
    </div>
  )
}

/**
 * SturdyElevationCard:
 * Sturdy flat elevation card with predictable 2D lift (y: -3px),
 * crisp border highlight, and soft multi-layered shadow.
 * Strictly 2D, NO 3D tilt distortion.
 */
interface SturdyElevationCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function SturdyElevationCard({
  children,
  className = '',
  onClick,
}: SturdyElevationCardProps) {
  return (
    <motion.div
      onClick={onClick}
      className={`group relative rounded-2xl border border-slate-200/90 bg-white transition-colors duration-200 will-change-transform ${className}`}
      whileHover={{
        y: -3,
        transition: { type: 'spring', stiffness: 450, damping: 25 },
      }}
      whileTap={{
        scale: 0.99,
        transition: { type: 'spring', stiffness: 500, damping: 30 },
      }}
    >
      {/* Subtle border shine on hover */}
      <div className="pointer-events-none absolute -inset-px rounded-2xl border border-transparent transition-colors duration-300 group-hover:border-emerald-500/30" />
      {children}
    </motion.div>
  )
}

/**
 * ScrollProgressBar:
 * Rendered at the top of the viewport or header to show real-time reading progress.
 */
export function ScrollProgressBar({ className = '' }: { className?: string }) {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    restDelta: 0.001,
  })

  return (
    <motion.div
      className={`h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 origin-left z-50 ${className}`}
      style={{ scaleX }}
    />
  )
}
