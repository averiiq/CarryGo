'use client'

import React, { useRef, useState, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  Package,
  Plane,
  ShieldCheck,
  KeyRound,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

const SENDER_STEPS = [
  {
    step: 1,
    title: 'Post Parcel Details in 2 Minutes',
    desc: 'Enter pickup & dropoff cities in Haryana, package dimensions, weight, and desired delivery window.',
    tag: 'Instant Broadcast',
    icon: Package,
    color: 'emerald',
  },
  {
    step: 2,
    title: 'Select Aadhaar-Verified Traveler',
    desc: 'Review commuters traveling your exact route. Inspect government ID verification status, vehicle type, and ratings.',
    tag: 'Govt. KYC Match',
    icon: ShieldCheck,
    color: 'teal',
  },
  {
    step: 3,
    title: 'Doorstep Pickup with 4-Digit PIN',
    desc: 'Meet traveler in person, verify their live badge, and hand over the parcel by authenticating pickup with private OTP.',
    tag: 'Golden Passkey',
    icon: KeyRound,
    color: 'sky',
  },
  {
    step: 4,
    title: 'Delivery Confirmation & Safe Release',
    desc: 'Recipient inspects package and enters delivery code. Funds safely held in SafeVault™ are instantly settled to the traveler.',
    tag: 'Escrow Guarantee',
    icon: Lock,
    color: 'amber',
  },
]

const TRAVELER_STEPS = [
  {
    step: 1,
    title: 'Publish Your Commute Itinerary',
    desc: 'Share your upcoming travel route across Haryana districts (car, train, or flight) and open luggage capacity.',
    tag: 'Open Space Monetization',
    icon: Plane,
    color: 'sky',
  },
  {
    step: 2,
    title: 'Review Verified Delivery Requests',
    desc: 'Accept only parcels and sealed items along your travel path that match your route schedule and comfort.',
    tag: 'Curated Selections',
    icon: ShieldCheck,
    color: 'emerald',
  },
  {
    step: 3,
    title: 'Handover & Travel Regularly',
    desc: 'Verify sender parcel at pickup, enter 4-digit pickup code, and carry item during your normal transit trip.',
    tag: 'Zero Detours',
    icon: KeyRound,
    color: 'teal',
  },
  {
    step: 4,
    title: 'Instant Bank Settlement via UPI',
    desc: 'Hand package to recipient at destination. Upon confirmation code entry, your earnings are wired instantly to your UPI.',
    tag: 'Instant Cashout',
    icon: Lock,
    color: 'amber',
  },
]

export function ScrollTrackJourney() {
  const [persona, setPersona] = useState<'senders' | 'travelers'>('senders')
  const trackRef = useRef<HTMLDivElement>(null)
  const lineRef = useRef<HTMLDivElement>(null)
  const beaconRef = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()

  const currentSteps = persona === 'senders' ? SENDER_STEPS : TRAVELER_STEPS

  useEffect(() => {
    if (shouldReduceMotion || !trackRef.current || !lineRef.current) return

    const container = trackRef.current
    const line = lineRef.current
    const beacon = beaconRef.current

    const ctx = gsap.context(() => {
      // Smoothly animate route line drawing on scroll
      gsap.fromTo(
        line,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: container,
            start: 'top 75%',
            end: 'bottom 50%',
            scrub: 1,
          },
        }
      )

      // Move transit beacon along the track on scroll
      if (beacon) {
        gsap.fromTo(
          beacon,
          { top: '0%' },
          {
            top: '95%',
            ease: 'none',
            scrollTrigger: {
              trigger: container,
              start: 'top 75%',
              end: 'bottom 50%',
              scrub: 1,
            },
          }
        )
      }
    }, trackRef)

    return () => ctx.revert()
  }, [persona, shouldReduceMotion])

  return (
    <div className="w-full max-w-5xl mx-auto space-y-10">
      {/* Persona Toggle Segmented Control */}
      <div className="flex justify-center">
        <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={() => setPersona('senders')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              persona === 'senders'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>How Senders Ship</span>
          </button>

          <button
            type="button"
            onClick={() => setPersona('travelers')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              persona === 'travelers'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plane className="w-4 h-4" />
            <span>How Travelers Earn</span>
          </button>
        </div>
      </div>

      {/* Main Track & Checkpoints Container */}
      <div ref={trackRef} className="relative pl-6 md:pl-16">
        {/* Background Track Rail */}
        <div className="absolute left-2.5 md:left-6 top-4 bottom-4 w-1 bg-slate-200/90 rounded-full" />

        {/* GSAP Scrubbed Active Progress Line */}
        <div
          ref={lineRef}
          className="absolute left-2.5 md:left-6 top-4 bottom-4 w-1 bg-gradient-to-b from-emerald-500 via-teal-500 to-sky-500 rounded-full origin-top"
        />

        {/* GSAP Moving Transit Beacon Marker */}
        <div
          ref={beaconRef}
          className="absolute left-[3px] md:left-[17px] top-4 w-4 h-4 rounded-full bg-emerald-700 border-2 border-white shadow-md z-20 flex items-center justify-center -translate-y-1/2 pointer-events-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        </div>

        {/* 4 Step Milestone Cards */}
        <div className="space-y-6">
          {currentSteps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="sturdy-card p-5 sm:p-6 relative overflow-hidden transition-all hover:border-emerald-300"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-sm shadow-2xs">
                      0{step.step}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                          {step.tag}
                        </span>
                      </div>
                      <h4 className="text-base sm:text-lg font-heading font-bold text-slate-900">
                        {step.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 self-end sm:self-center">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-emerald-700">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Dynamic Persona Action Button */}
      <div className="flex justify-center pt-2">
        <Link
          href={persona === 'senders' ? '/create-parcel' : '/create-trip'}
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <span>{persona === 'senders' ? 'Ship a Same-Day Parcel' : 'Monetize Your Travel Route'}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
