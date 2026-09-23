'use client'

import { useEffect, useRef, type ComponentPropsWithoutRef } from 'react'
import { useInView, useMotionValue, useSpring, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface NumberTickerProps extends ComponentPropsWithoutRef<'span'> {
  value: number
  startValue?: number
  direction?: 'up' | 'down'
  delay?: number
  decimalPlaces?: number
  suffix?: string
  prefix?: string
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = 'up',
  delay = 0,
  className,
  decimalPlaces = 0,
  suffix = '',
  prefix = '',
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const shouldReduceMotion = useReducedMotion()

  const motionValue = useMotionValue(direction === 'down' ? value : startValue)
  const springValue = useSpring(motionValue, {
    damping: 45,
    stiffness: 90,
  })
  const isInView = useInView(ref, { once: true, margin: '0px 0px -50px 0px' })

  useEffect(() => {
    if (shouldReduceMotion) {
      if (ref.current) {
        ref.current.textContent = `${prefix}${value.toLocaleString()}${suffix}`
      }
      return
    }

    let timer: ReturnType<typeof setTimeout> | null = null

    if (isInView) {
      timer = setTimeout(() => {
        motionValue.set(direction === 'down' ? startValue : value)
      }, delay * 1000)
    }

    return () => {
      if (timer !== null) {
        clearTimeout(timer)
      }
    }
  }, [motionValue, isInView, delay, value, direction, startValue, shouldReduceMotion, prefix, suffix])

  useEffect(() => {
    if (shouldReduceMotion) return

    const unsubscribe = springValue.on('change', (latest) => {
      if (ref.current) {
        const formatted = Intl.NumberFormat('en-IN', {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(Number(latest.toFixed(decimalPlaces)))

        ref.current.textContent = `${prefix}${formatted}${suffix}`
      }
    })

    return () => unsubscribe()
  }, [springValue, decimalPlaces, prefix, suffix, shouldReduceMotion])

  return (
    <span
      ref={ref}
      className={cn(
        'inline-block tabular-nums font-heading font-extrabold tracking-tight',
        className
      )}
      {...props}
    >
      {prefix}
      {startValue.toLocaleString()}
      {suffix}
    </span>
  )
}
