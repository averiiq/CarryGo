'use client'

import React, { type ComponentPropsWithoutRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ShimmerButtonProps extends ComponentPropsWithoutRef<'button'> {
  shimmerColor?: string
  shimmerSize?: string
  borderRadius?: string
  shimmerDuration?: string
  background?: string
  className?: string
  children?: React.ReactNode
}

export function ShimmerButton({
  shimmerColor = '#ffffff',
  shimmerSize = '0.1em',
  shimmerDuration = '2.5s',
  borderRadius = '16px',
  background = 'rgba(5, 150, 105, 1)',
  className,
  children,
  ...props
}: ShimmerButtonProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <button
      style={
        {
          '--spread': '90deg',
          '--shimmer-color': shimmerColor,
          '--radius': borderRadius,
          '--speed': shimmerDuration,
          '--cut': shimmerSize,
          '--bg': background,
        } as React.CSSProperties
      }
      className={cn(
        'group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap px-6 py-3 text-white [background:var(--bg)] [border-radius:var(--radius)] transition-transform duration-200 active:scale-[0.98]',
        className
      )}
      {...props}
    >
      {/* Spark container */}
      {!shouldReduceMotion && (
        <div
          className={cn(
            '-z-30 blur-[2px]',
            'absolute inset-0 overflow-visible [container-type:size]'
          )}
        >
          {/* Spark */}
          <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none]">
            {/* Spark before */}
            <div className="animate-spin-around absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [translate:0_0]" />
          </div>
        </div>
      )}

      {/* Subtle highlight overlay */}
      <span className="absolute inset-0 rounded-[inherit] bg-gradient-to-t from-white/0 via-white/10 to-white/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Button content */}
      <span className="relative z-10 flex items-center justify-center gap-2 font-bold tracking-tight">
        {children}
      </span>
    </button>
  )
}
