'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface BorderBeamProps {
  /** Size of the beam path stroke in percentage */
  size?: number
  /** Duration of the beam rotation in seconds */
  duration?: number
  delay?: number
  colorFrom?: string
  colorTo?: string
  className?: string
  reverse?: boolean
  borderWidth?: number
  rx?: number
}

export function BorderBeam({
  duration = 7,
  colorFrom = '#059669',
  colorTo = '#0284c7',
  className,
  reverse = false,
  borderWidth = 1.5,
  rx = 24,
}: BorderBeamProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden',
        className
      )}
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="beamGradientStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorFrom} stopOpacity="0" />
            <stop offset="40%" stopColor={colorFrom} stopOpacity="1" />
            <stop offset="70%" stopColor={colorTo} stopOpacity="1" />
            <stop offset="100%" stopColor={colorTo} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Crisp 1-2px animated perimeter stroke ray */}
        <motion.rect
          x={borderWidth / 2}
          y={borderWidth / 2}
          width={`calc(100% - ${borderWidth}px)`}
          height={`calc(100% - ${borderWidth}px)`}
          rx={rx}
          fill="none"
          stroke="url(#beamGradientStroke)"
          strokeWidth={borderWidth}
          pathLength={100}
          strokeDasharray="16 84"
          animate={{
            strokeDashoffset: reverse ? [0, 100] : [0, -100],
          }}
          transition={{
            repeat: Infinity,
            ease: 'linear',
            duration,
          }}
        />
      </svg>
    </div>
  )
}
