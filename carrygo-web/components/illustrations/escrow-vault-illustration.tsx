'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, Lock, CheckCircle2, Shield, ArrowRight, Wallet } from 'lucide-react'

export function EscrowVaultIllustration({ className = '' }: { className?: string }) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(2)

  const steps = [
    {
      num: 1,
      title: '1. SafeVault™ Held',
      desc: 'Reward held in protected custody',
      badge: 'Zero Upfront Risk',
      color: 'border-amber-400 bg-amber-50 text-amber-700',
    },
    {
      num: 2,
      title: '2. Golden Passkey Transit',
      desc: 'Personal verification at pickup & delivery',
      badge: 'Flawless Handshake',
      color: 'border-sky-400 bg-sky-50 text-sky-700',
    },
    {
      num: 3,
      title: '3. Instant Release',
      desc: 'Rewards released directly to traveler UPI',
      badge: 'Guaranteed Payout',
      color: 'border-emerald-400 bg-emerald-50 text-emerald-700',
    },
  ]

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-surface via-surface-elevated/70 to-surface p-6 shadow-bento ${className}`}
    >
      {/* Background Cyber Grid */}
      <div className="cyber-grid opacity-40" />

      {/* Top Banner */}
      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-foreground">
              SafeVault™ Signature Protection
            </h4>
            <p className="text-[11px] text-muted">Guaranteed rewards released upon Golden Handshake</p>
          </div>
        </div>

        <span className="rounded-full bg-emerald-100/70 px-3 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-300/60">
          ₹10,000 Guarantee
        </span>
      </div>

      {/* Interactive Step Selector */}
      <div className="relative z-10 my-6 grid grid-cols-3 gap-2.5">
        {steps.map((step) => {
          const isActive = activeStep === step.num
          return (
            <button
              key={step.num}
              type="button"
              onClick={() => setActiveStep(step.num as 1 | 2 | 3)}
              className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all duration-200 ${
                isActive
                  ? 'border-emerald-500 bg-surface shadow-md ring-2 ring-emerald-500/20'
                  : 'border-border/70 bg-surface/60 hover:bg-surface'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-emerald-700 text-white' : 'bg-surface-elevated text-muted'
                  }`}
                >
                  {step.num}
                </span>
                {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
              </div>
              <p className="mt-2 text-xs font-heading font-bold text-foreground">{step.title}</p>
              <p className="mt-0.5 text-[10px] text-muted leading-tight line-clamp-2">{step.desc}</p>
            </button>
          )
        })}
      </div>

      {/* Dynamic Animated Vault Stage */}
      <div className="relative z-10 rounded-2xl border border-border/80 bg-surface p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-inner">
              {activeStep === 1 ? (
                <Wallet className="h-6 w-6" />
              ) : activeStep === 2 ? (
                <KeyRound className="h-6 w-6 animate-pulse" />
              ) : (
                <Shield className="h-6 w-6 text-emerald-600" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                {activeStep === 1 && 'Step 1: Fare Allocated to Escrow Vault'}
                {activeStep === 2 && 'Step 2: 4-Digit Handover Verification'}
                {activeStep === 3 && 'Step 3: Instant UPI Traveler Settlement'}
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                {activeStep === 1 && 'No direct payment to traveler until delivery is physically inspected.'}
                {activeStep === 2 && 'Sender & recipient generate one-time codes validated inside the app.'}
                {activeStep === 3 && 'Payment instantly deposited directly to traveler bank account.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
              {activeStep === 1 ? '🔒 Escrow Locked' : activeStep === 2 ? '🔑 OTP Protocol' : '⚡ 0s UPI Release'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
