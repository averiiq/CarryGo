'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { sendOtp, verifyOtp, reviewerLogin } from '@/app/login/actions'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 60
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface Props {
  initialError?: string
  nextPath?: string
}

export function LoginForm({ initialError, nextPath = '' }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [errorMsg, setErrorMsg] = useState<string | undefined>(
    initialError === 'auth_failed'
      ? 'Authentication failed. Please verify and try again.'
      : initialError === 'reviewer_failed'
      ? 'Reviewer account sign-in failed. Please try manual email login.'
      : initialError
  )
  const [infoMsg, setInfoMsg] = useState<string | undefined>()
  const [cooldown, setCooldown] = useState(0)
  const [isPending, startTransition] = useTransition()
  const [reviewerLoading, setReviewerLoading] = useState(false)

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([])
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Resend countdown timer
  useEffect(() => {
    if (cooldown > 0) {
      cooldownTimerRef.current = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current)
    }
  }, [cooldown])

  // Focus first OTP input when transitioning to OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus()
      }, 150)
    }
  }, [step])

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMsg(undefined)
    setInfoMsg(undefined)

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !EMAIL_REGEX.test(cleanEmail)) {
      setErrorMsg('Please enter a valid email address.')
      return
    }

    startTransition(async () => {
      const res = await sendOtp(cleanEmail)
      if (res.success) {
        setStep('otp')
        setCooldown(RESEND_COOLDOWN)
        setOtp(Array(OTP_LENGTH).fill(''))
        setInfoMsg(`Verification code sent to ${cleanEmail}`)
      } else {
        setErrorMsg(res.error || 'Failed to send code. Please try again.')
      }
    })
  }

  const handleVerifyCode = (codeToVerify?: string) => {
    const finalCode = (codeToVerify || otp.join('')).trim()
    if (finalCode.length !== OTP_LENGTH) {
      setErrorMsg(`Please enter all ${OTP_LENGTH} digits.`)
      return
    }

    setErrorMsg(undefined)
    setInfoMsg(undefined)

    startTransition(async () => {
      const res = await verifyOtp(email, finalCode, nextPath)
      if (res.success && res.redirectUrl) {
        setInfoMsg('Authentication successful! Redirecting...')
        router.push(res.redirectUrl)
      } else {
        setErrorMsg(res.error || 'Invalid code. Please try again.')
        setOtp(Array(OTP_LENGTH).fill(''))
        setTimeout(() => {
          otpInputsRef.current[0]?.focus()
        }, 100)
      }
    })
  }

  const handleOtpChange = (val: string, index: number) => {
    setErrorMsg(undefined)
    const digits = val.replace(/\D/g, '')

    // Handle paste of full or partial code
    if (digits.length > 1) {
      const newOtp = [...otp]
      for (let i = 0; i < digits.length && index + i < OTP_LENGTH; i++) {
        newOtp[index + i] = digits[i]
      }
      setOtp(newOtp)
      const nextIdx = Math.min(index + digits.length, OTP_LENGTH - 1)
      otpInputsRef.current[nextIdx]?.focus()

      // Auto submit if all digits filled
      if (newOtp.every((d) => d !== '')) {
        handleVerifyCode(newOtp.join(''))
      }
      return
    }

    const singleDigit = digits.slice(-1)
    const newOtp = [...otp]
    newOtp[index] = singleDigit
    setOtp(newOtp)

    if (singleDigit && index < OTP_LENGTH - 1) {
      otpInputsRef.current[index + 1]?.focus()
    }

    // Auto submit if all digits filled
    if (singleDigit && newOtp.every((d) => d !== '')) {
      handleVerifyCode(newOtp.join(''))
    }
  }

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const newOtp = [...otp]
      newOtp[index - 1] = ''
      setOtp(newOtp)
      otpInputsRef.current[index - 1]?.focus()
    }
  }

  const handleBackToEmail = () => {
    setStep('email')
    setErrorMsg(undefined)
    setInfoMsg(undefined)
  }

  const handleReviewerClick = async () => {
    setReviewerLoading(true)
    setErrorMsg(undefined)
    try {
      await reviewerLogin(nextPath)
    } catch {
      setErrorMsg('Failed to log in as reviewer. Please try manual email login.')
      setReviewerLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Reviewer Quick Access Banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary-subtle p-4 shadow-sm relative overflow-hidden">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-md shadow-primary/25">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Reviewer Quick Access</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                1-Click
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Skip verification code to test the live portal with our verified reviewer account.
            </p>
            <button
              type="button"
              onClick={handleReviewerClick}
              disabled={reviewerLoading || isPending}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-hover active:scale-[0.98] transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {reviewerLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Signing In As Reviewer...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Instant Reviewer Access
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 md:p-8 space-y-6 border border-border/80 shadow-xl rounded-2xl bg-surface">
        {/* Top Header / Mode */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
              Passwordless Auth
            </span>
          </div>

          <a
            href={process.env.NEXT_PUBLIC_CMS_URL ? `${process.env.NEXT_PUBLIC_CMS_URL}/login` : 'https://carrygo.averiq.in/login'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium px-2.5 py-1 rounded-lg border border-border text-muted hover:text-primary hover:border-primary/40 transition-colors inline-flex items-center gap-1"
            title="Open Admin CMS Operations Console"
          >
            Admin Portal ↗
          </a>
        </div>

        {/* Feedback Banners */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2.5 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {infoMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs flex items-start gap-2.5 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* STEP 1: Email Form */}
        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="space-y-5">
            <div className="space-y-1.5">
              <h2 className="text-xl font-heading font-bold text-foreground">
                Sign In with Email
              </h2>
              <p className="text-xs text-muted leading-relaxed">
                Enter your email address. We'll send you a 6-digit one-time code to sign in instantly.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs font-semibold text-foreground">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  autoFocus
                  disabled={isPending}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || !email.trim()}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-xl shadow-md shadow-primary/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  <span>Continue with Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-muted leading-normal">
                By continuing, you agree to CarryGo&apos;s{' '}
                <a href="/terms-and-conditions" className="text-primary hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy-policy" className="text-primary hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </form>
        ) : (
          /* STEP 2: OTP Verification Form */
          <div className="space-y-5">
            <button
              type="button"
              onClick={handleBackToEmail}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Change email</span>
            </button>

            <div className="space-y-1.5">
              <h2 className="text-xl font-heading font-bold text-foreground">
                Check your inbox
              </h2>
              <p className="text-xs text-muted leading-relaxed">
                We sent a 6-digit code to{' '}
                <span className="font-semibold text-foreground">{email}</span>. Enter it below to sign in.
              </p>
            </div>

            {/* 6 Digit Input Boxes */}
            <div className="flex items-center justify-between gap-2 pt-1">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputsRef.current[idx] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(e.target.value, idx)}
                  onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                  disabled={isPending}
                  className={`w-12 h-14 text-center text-xl font-heading font-bold rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    digit
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-background text-foreground'
                  } disabled:opacity-50`}
                />
              ))}
            </div>

            {/* Verify Button */}
            <button
              type="button"
              onClick={() => handleVerifyCode()}
              disabled={isPending || otp.join('').length !== OTP_LENGTH}
              className="w-full py-2.5 px-4 bg-primary hover:bg-primary-hover text-white font-semibold text-sm rounded-xl shadow-md shadow-primary/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Code...
                </>
              ) : (
                <>
                  <span>Verify &amp; Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Resend Code Section */}
            <div className="text-center pt-2">
              {cooldown > 0 ? (
                <span className="text-xs text-muted">
                  Resend code in <span className="font-semibold text-foreground">{cooldown}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendCode()}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Resend Code</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
