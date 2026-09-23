'use client'

import { motion, useReducedMotion } from 'framer-motion'

export function HeroTransitVectors() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none"
    >
      <svg
        className="w-full h-full min-h-[620px] opacity-75"
        viewBox="0 0 1200 680"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Gradient for transit vector arcs */}
          <linearGradient id="heroVectorGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
          </linearGradient>

          <linearGradient id="heroVectorGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.3" />
            <stop offset="60%" stopColor="#059669" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.03" />
          </linearGradient>

          {/* Node pulse glow */}
          <radialGradient id="nodePulseGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Primary Intercity Highway Arc (Gurugram -> Rohtak -> Panipat vector) */}
        <path
          d="M 60 520 C 320 460, 580 180, 1140 140"
          stroke="url(#heroVectorGrad1)"
          strokeWidth="1.75"
          strokeDasharray="6 6"
        />

        {/* Animated Traveling Packet on Primary Arc */}
        {!shouldReduceMotion && (
          <motion.g
            animate={{
              offsetDistance: ['0%', '100%'],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              offsetPath: 'path("M 60 520 C 320 460, 580 180, 1140 140")',
            }}
          >
            <circle r="6" fill="#10b981" opacity="0.3" />
            <circle r="3" fill="#059669" />
            <circle r="1.2" fill="#ffffff" />
          </motion.g>
        )}

        {/* 2. Secondary Corridor Trajectory Arc (Faridabad -> Sonipat -> Ambala Cantt) */}
        <path
          d="M 180 620 C 480 500, 720 260, 1180 320"
          stroke="url(#heroVectorGrad2)"
          strokeWidth="1.5"
          strokeDasharray="4 8"
        />

        {/* Animated Traveling Packet on Secondary Arc */}
        {!shouldReduceMotion && (
          <motion.g
            animate={{
              offsetDistance: ['0%', '100%'],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 2.5,
            }}
            style={{
              offsetPath: 'path("M 180 620 C 480 500, 720 260, 1180 320")',
            }}
          >
            <circle r="5" fill="#0284c7" opacity="0.35" />
            <circle r="2.5" fill="#0284c7" />
            <circle r="1" fill="#ffffff" />
          </motion.g>
        )}

        {/* 3. Minimal Precision Waypoint Nodes (Intercity Commuter Waypoints) */}
        {/* Waypoint A: Gurugram Node */}
        <g transform="translate(195, 485)">
          <circle r="14" fill="url(#nodePulseGlow)" className="animate-transit-pulse" />
          <circle r="4.5" fill="#ffffff" stroke="#059669" strokeWidth="2" />
          <circle r="2" fill="#059669" />
          <text
            x="12"
            y="4"
            fill="#64748b"
            fontSize="9"
            fontFamily="monospace"
            letterSpacing="0.08em"
            fontWeight="600"
          >
            28.45°N • GGM-HUB
          </text>
        </g>

        {/* Waypoint B: Rohtak Junction Node */}
        <g transform="translate(560, 310)">
          <circle r="14" fill="url(#nodePulseGlow)" className="animate-transit-pulse" />
          <circle r="4.5" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
          <circle r="2" fill="#0284c7" />
          <text
            x="12"
            y="-4"
            fill="#64748b"
            fontSize="9"
            fontFamily="monospace"
            letterSpacing="0.08em"
            fontWeight="600"
          >
            28.89°N • RTK-CORRIDOR
          </text>
        </g>

        {/* Waypoint C: Panipat Terminal Node */}
        <g transform="translate(940, 175)">
          <circle r="14" fill="url(#nodePulseGlow)" className="animate-transit-pulse" />
          <circle r="4.5" fill="#ffffff" stroke="#059669" strokeWidth="2" />
          <circle r="2" fill="#059669" />
          <text
            x="12"
            y="4"
            fill="#64748b"
            fontSize="9"
            fontFamily="monospace"
            letterSpacing="0.08em"
            fontWeight="600"
          >
            29.39°N • PNP-NORTH
          </text>
        </g>

        {/* 4. Precision Crosshair Reticles (+) at Architectural Grid Intersections */}
        {/* Reticle 1: Top Right */}
        <g transform="translate(1080, 75)" className="animate-coordinate-breathe">
          <path d="M 0 -7 L 0 7 M -7 0 L 7 0" stroke="#059669" strokeWidth="1.2" opacity="0.45" />
          <circle r="1" fill="#059669" opacity="0.6" />
        </g>

        {/* Reticle 2: Mid-Center */}
        <g transform="translate(680, 120)" className="animate-coordinate-breathe">
          <path d="M 0 -6 L 0 6 M -6 0 L 6 0" stroke="#94a3b8" strokeWidth="1" opacity="0.35" />
        </g>

        {/* Reticle 3: Far Left Baseline */}
        <g transform="translate(90, 240)" className="animate-coordinate-breathe">
          <path d="M 0 -6 L 0 6 M -6 0 L 6 0" stroke="#059669" strokeWidth="1" opacity="0.35" />
        </g>

        {/* Reticle 4: Right Mid */}
        <g transform="translate(1120, 480)" className="animate-coordinate-breathe">
          <path d="M 0 -7 L 0 7 M -7 0 L 7 0" stroke="#0284c7" strokeWidth="1.2" opacity="0.4" />
        </g>

        {/* 5. Minimal Corner Dimension Brackets */}
        {/* Top-Right L-bracket */}
        <path
          d="M 1150 50 L 1170 50 L 1170 70"
          stroke="#94a3b8"
          strokeWidth="1.2"
          opacity="0.3"
          fill="none"
        />

        {/* Bottom-Left L-bracket */}
        <path
          d="M 50 630 L 50 650 L 70 650"
          stroke="#94a3b8"
          strokeWidth="1.2"
          opacity="0.25"
          fill="none"
        />
      </svg>
    </div>
  )
}
