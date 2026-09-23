'use client'

import React, { useRef, useEffect, type ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReducedMotion } from 'framer-motion'

// Register ScrollTrigger once on client
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

/**
 * GsapScrollExpand:
 * Smoothly expands a container horizontally and scales up from 0.94 -> 1.0
 * with scrubbed physics as the user scrolls into it.
 */
interface GsapScrollExpandProps {
  children: ReactNode
  className?: string
  startScale?: number
  endScale?: number
}

export function GsapScrollExpand({
  children,
  className = '',
  startScale = 0.94,
  endScale = 1.0,
}: GsapScrollExpandProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (shouldReduceMotion || !containerRef.current) return

    const el = containerRef.current
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        {
          scale: startScale,
          borderRadius: '32px',
        },
        {
          scale: endScale,
          borderRadius: '24px',
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            end: 'top 30%',
            scrub: 1.2,
          },
        }
      )
    }, containerRef)

    return () => ctx.revert()
  }, [shouldReduceMotion, startScale, endScale])

  return (
    <div
      ref={containerRef}
      className={`will-change-transform transform-gpu ${className}`}
    >
      {children}
    </div>
  )
}

/**
 * GsapParallaxItem:
 * Silky scrubbed vertical parallax translation with GSAP ScrollTrigger.
 */
interface GsapParallaxItemProps {
  children: ReactNode
  distance?: number // e.g. -40px or 60px
  className?: string
}

export function GsapParallaxItem({
  children,
  distance = -40,
  className = '',
}: GsapParallaxItemProps) {
  const itemRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (shouldReduceMotion || !itemRef.current) return

    const el = itemRef.current
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: -distance / 2 },
        {
          y: distance / 2,
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.2,
          },
        }
      )
    }, itemRef)

    return () => ctx.revert()
  }, [shouldReduceMotion, distance])

  return (
    <div ref={itemRef} className={`will-change-transform ${className}`}>
      {children}
    </div>
  )
}

/**
 * GsapScrollTrack:
 * Draws a route path line and moves a commuter beacon along the line
 * scrubbed strictly to the user's scroll position.
 */
interface GsapScrollTrackProps {
  children: ReactNode
  className?: string
}

export function GsapScrollTrack({
  children,
  className = '',
}: GsapScrollTrackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const progressLineRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    if (shouldReduceMotion || !containerRef.current || !progressLineRef.current) return

    const container = containerRef.current
    const line = progressLineRef.current
    const marker = markerRef.current

    const ctx = gsap.context(() => {
      // Progress line fill
      gsap.fromTo(
        line,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: container,
            start: 'top 70%',
            end: 'bottom 40%',
            scrub: 1,
          },
        }
      )

      // Moving beacon marker
      if (marker) {
        gsap.fromTo(
          marker,
          { y: 0, opacity: 0 },
          {
            y: () => container.offsetHeight - 40,
            opacity: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: container,
              start: 'top 70%',
              end: 'bottom 40%',
              scrub: 1,
            },
          }
        )
      }
    }, containerRef)

    return () => ctx.revert()
  }, [shouldReduceMotion])

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Background Track Rail */}
      <div className="absolute left-6 top-6 bottom-6 w-1 bg-slate-200/80 rounded-full hidden md:block" />

      {/* Scrubbed Active Progress Line */}
      <div
        ref={progressLineRef}
        className="absolute left-6 top-6 bottom-6 w-1 bg-gradient-to-b from-emerald-500 via-teal-500 to-sky-500 rounded-full origin-top hidden md:block"
      />

      {/* Scrubbed Moving Commuter Marker */}
      <div
        ref={markerRef}
        className="absolute left-[18px] top-6 w-4 h-4 rounded-full bg-emerald-600 border-2 border-white shadow-md z-20 hidden md:flex items-center justify-center -translate-y-1/2"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      </div>

      <div className="md:pl-16">
        {children}
      </div>
    </div>
  )
}
