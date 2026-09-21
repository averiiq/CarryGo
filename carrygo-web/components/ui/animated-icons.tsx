'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AnimatedIconProps {
  size?: number
  className?: string
  color?: string
  interactive?: boolean
}

/**
 * AnimatedShieldBeacon:
 * Displays a government KYC cryptographic shield with an outer pulsing aura,
 * rotating orbital dashed ring on hover, and verified checkmark spring.
 */
export function AnimatedShieldBeacon({
  size = 40,
  className = '',
  color = '#059669',
  interactive = true,
}: AnimatedIconProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center cursor-pointer select-none ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      whileHover={interactive ? { scale: 1.1 } : undefined}
      whileTap={interactive ? { scale: 0.95 } : undefined}
    >
      {/* Outer Pulse Wave */}
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: `${color}25` }}
        animate={{
          scale: [1, 1.4, 1],
          opacity: [0.6, 0, 0.6],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* SVG Shield & Rings */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        {/* Orbital Dash Ring */}
        <motion.circle
          cx="24"
          cy="24"
          r="21"
          stroke={color}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          animate={{ rotate: isHovered ? 360 : 0 }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="opacity-40"
        />

        {/* Shield Body */}
        <motion.path
          d="M24 6L38 12V22C38 31.5 32 39.5 24 42C16 39.5 10 31.5 10 22V12L24 6Z"
          fill={`${color}15`}
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          animate={{
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        />

        {/* Inner Checkmark */}
        <motion.path
          d="M17 23L22 28L31 18"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 1 }}
          animate={{
            pathLength: isHovered ? [0, 1] : 1,
          }}
          transition={{ duration: 0.4 }}
        />
      </svg>
    </motion.div>
  )
}

/**
 * AnimatedRouteNode:
 * Interactive route pathway connecting two city hubs with a traveling courier packet beam.
 */
export function AnimatedRouteNode({
  size = 40,
  className = '',
  color = '#0284C7',
  interactive = true,
}: AnimatedIconProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center cursor-pointer select-none ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      whileHover={interactive ? { scale: 1.12 } : undefined}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Curving Transit Path */}
        <path
          d="M10 36C14 22 34 26 38 12"
          stroke={`${color}30`}
          strokeWidth="2.5"
          strokeDasharray="3 3"
        />

        {/* Animated Courier Dash Beam */}
        <motion.path
          d="M10 36C14 22 34 26 38 12"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="8 24"
          animate={{ strokeDashoffset: [0, -32] }}
          transition={{ duration: isHovered ? 0.9 : 1.8, repeat: Infinity, ease: 'linear' }}
        />

        {/* Origin Pin Node */}
        <circle cx="10" cy="36" r="4" fill={color} />
        <circle cx="10" cy="36" r="7" stroke={color} strokeWidth="1" opacity="0.4" />

        {/* Destination Pin Node */}
        <circle cx="38" cy="12" r="4.5" fill="#10B981" />
        <motion.circle
          cx="38"
          cy="12"
          r="8"
          stroke="#10B981"
          strokeWidth="1.5"
          animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      </svg>
    </motion.div>
  )
}

/**
 * AnimatedPackageDelivery:
 * Isometric floating 3D parcel with interactive lid spring & sparkle bursts on hover.
 */
export function AnimatedPackageDelivery({
  size = 40,
  className = '',
  color = '#D97706',
  interactive = true,
}: AnimatedIconProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center cursor-pointer select-none ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      whileHover={interactive ? { scale: 1.1 } : undefined}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Box Shadow */}
        <ellipse cx="24" cy="41" rx="14" ry="3.5" fill={`${color}20`} />

        {/* Parcel Isometric Box */}
        <motion.g
          animate={{ y: isHovered ? -3 : 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 15 }}
        >
          {/* Left Face */}
          <path d="M11 19L24 26V40L11 33V19Z" fill={`${color}25`} stroke={color} strokeWidth="2" />
          {/* Right Face */}
          <path d="M37 19L24 26V40L37 33V19Z" fill={`${color}40`} stroke={color} strokeWidth="2" />
          {/* Top Face */}
          <motion.path
            d="M24 12L37 19L24 26L11 19L24 12Z"
            fill={`${color}60`}
            stroke={color}
            strokeWidth="2"
            animate={{
              y: isHovered ? -2 : 0,
            }}
            transition={{ type: 'spring', stiffness: 450, damping: 10 }}
          />

          {/* Sealing Tape */}
          <path d="M21 14.5L27 18V38.5L21 35V14.5Z" fill="#10B981" opacity="0.8" />
        </motion.g>

        {/* Hover Sparkles */}
        <AnimatePresence>
          {isHovered && (
            <>
              <motion.circle
                cx="37"
                cy="11"
                r="1.5"
                fill="#10B981"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              />
              <motion.circle
                cx="11"
                cy="14"
                r="1.2"
                fill={color}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              />
            </>
          )}
        </AnimatePresence>
      </svg>
    </motion.div>
  )
}

/**
 * AnimatedWalletVault:
 * Smart Escrow Vault lock with opening shackle, glowing biometric key, and UPI release beam.
 */
export function AnimatedWalletVault({
  size = 40,
  className = '',
  color = '#10B981',
  interactive = true,
}: AnimatedIconProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center cursor-pointer select-none ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      whileHover={interactive ? { scale: 1.1 } : undefined}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Shackle */}
        <motion.path
          d="M17 21V15C17 11.134 20.134 8 24 8C27.866 8 31 11.134 31 15V21"
          stroke={color}
          strokeWidth="3.2"
          strokeLinecap="round"
          animate={{
            y: isHovered ? -4 : 0,
            rotate: isHovered ? 8 : 0,
          }}
          transition={{ type: 'spring', stiffness: 350, damping: 12 }}
        />

        {/* Vault Body */}
        <rect
          x="11"
          y="20"
          width="26"
          height="21"
          rx="6"
          fill={`${color}15`}
          stroke={color}
          strokeWidth="2.5"
        />

        {/* Vault Dial / Keyhole */}
        <circle cx="24" cy="30" r="4" stroke={color} strokeWidth="2" fill={`${color}30`} />
        <path d="M24 33V36" stroke={color} strokeWidth="2" strokeLinecap="round" />

        {/* Radiating UPI Rupee Glow on Hover */}
        <AnimatePresence>
          {isHovered && (
            <motion.circle
              cx="24"
              cy="30"
              r="8"
              stroke={color}
              strokeWidth="1.2"
              strokeDasharray="2 2"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.4, opacity: 0.8 }}
              exit={{ opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
          )}
        </AnimatePresence>
      </svg>
    </motion.div>
  )
}

/**
 * AnimatedChatBubble:
 * Floating encrypted messaging icon with live 3-dot typing wave and activity radar.
 */
export function AnimatedChatBubble({
  size = 40,
  className = '',
  color = '#059669',
  interactive = true,
}: AnimatedIconProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className={`relative inline-flex items-center justify-center cursor-pointer select-none ${className}`}
      style={{ width: size, height: size }}
      onMouseEnter={() => interactive && setIsHovered(true)}
      onMouseLeave={() => interactive && setIsHovered(false)}
      whileHover={interactive ? { scale: 1.1 } : undefined}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Back Bubble */}
        <path
          d="M13 14H29C33.4 14 37 17.6 37 22V24C37 28.4 33.4 32 29 32H27L22 36V32H13C8.6 32 5 28.4 5 24V22C5 17.6 8.6 14 13 14Z"
          fill={`${color}12`}
          stroke={`${color}50`}
          strokeWidth="1.5"
        />

        {/* Front Bubble */}
        <motion.path
          d="M19 19H35C39.4 19 43 22.6 43 27V29C43 33.4 39.4 37 35 37H33L28 41V37H19C14.6 37 11 33.4 11 29V27C11 22.6 14.6 19 19 19Z"
          fill={`${color}25`}
          stroke={color}
          strokeWidth="2"
          animate={{
            y: isHovered ? -1.5 : 0,
          }}
          transition={{ type: 'spring', stiffness: 400 }}
        />

        {/* Live Typing Wave Dots */}
        {[20, 27, 34].map((cx, i) => (
          <motion.circle
            key={cx}
            cx={cx}
            cy="28"
            r="2"
            fill={color}
            animate={{
              y: [0, -3.5, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              delay: i * 0.18,
              ease: 'easeInOut',
            }}
          />
        ))}
      </svg>
    </motion.div>
  )
}

/**
 * InteractiveIconBadge:
 * Magnetic 3D tilt card container for any icon, giving it a rich ambient background,
 * subtle spring scale, and radiant colored glow on hover.
 */
export function InteractiveIconBadge({
  children,
  tone = 'emerald',
  className = '',
}: {
  children: React.ReactNode
  tone?: 'emerald' | 'sky' | 'amber' | 'indigo' | 'rose'
  className?: string
}) {
  const toneMap = {
    emerald: {
      bg: 'bg-emerald-50/80 hover:bg-emerald-100/70',
      border: 'border-emerald-200/80 hover:border-emerald-400',
      glow: 'group-hover:shadow-[0_0_24px_rgba(5,150,105,0.25)]',
    },
    sky: {
      bg: 'bg-sky-50/80 hover:bg-sky-100/70',
      border: 'border-sky-200/80 hover:border-sky-400',
      glow: 'group-hover:shadow-[0_0_24px_rgba(2,132,199,0.25)]',
    },
    amber: {
      bg: 'bg-amber-50/80 hover:bg-amber-100/70',
      border: 'border-amber-200/80 hover:border-amber-400',
      glow: 'group-hover:shadow-[0_0_24px_rgba(217,119,6,0.25)]',
    },
    indigo: {
      bg: 'bg-indigo-50/80 hover:bg-indigo-100/70',
      border: 'border-indigo-200/80 hover:border-indigo-400',
      glow: 'group-hover:shadow-[0_0_24px_rgba(99,102,241,0.25)]',
    },
    rose: {
      bg: 'bg-rose-50/80 hover:bg-rose-100/70',
      border: 'border-rose-200/80 hover:border-rose-400',
      glow: 'group-hover:shadow-[0_0_24px_rgba(244,63,94,0.25)]',
    },
  }[tone]

  return (
    <motion.div
      className={`group relative flex items-center justify-center rounded-2xl border p-2.5 transition-all duration-300 ${toneMap.bg} ${toneMap.border} ${toneMap.glow} ${className}`}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
    >
      {children}
    </motion.div>
  )
}
