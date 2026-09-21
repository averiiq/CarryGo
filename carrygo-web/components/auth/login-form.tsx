'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, KeyRound, Loader2, ShieldCheck, Sparkles, User, UserPlus } from 'lucide-react'
import { login, signup, reviewerLogin } from '@/app/login/actions'
import { getClientPlatformConfig } from '@/lib/platform-config'

interface Props {
  initialError?: string
  initialMode?: 'signin' | 'signup'
  nextPath?: string
}

export function LoginForm({ initialError, initialMode = 'signin', nextPath = '' }: Props) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [signupsAllowed, setSignupsAllowed] = useState(true)
  const [loading, setLoading] = useState(false)
  const [reviewerLoading, setReviewerLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState(
    initialError === 'auth_failed'
      ? 'Invalid credentials. Please verify and try again.'
      : initialError === 'rate_limited'
      ? 'Too many login attempts. Please wait 1 minute.'
      : initialError === 'reviewer_failed'
      ? 'Reviewer account sign-in failed. Please try manual email login.'
      : initialError
  )

  useEffect(() => {
    void getClientPlatformConfig().then((cfg) => {
      setSignupsAllowed(cfg.newUserSignups)
      if (!cfg.newUserSignups && initialMode === 'signup') {
        setMode('signin')
        setErrorMsg('New account registrations are temporarily paused by administration.')
      }
    })
  }, [initialMode])

  const handleReviewerClick = async () => {
    setReviewerLoading(true)
    setErrorMsg(undefined)
    try {
      await reviewerLogin(nextPath)
    } catch {
      setErrorMsg('Failed to log in as reviewer. Please try again.')
      setReviewerLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Reviewer / Survey Quick Access Banner */}
      <div className="rounded-2xl border border-primary/20 bg-primary-subtle p-4 shadow-sm relative overflow-hidden">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-md shadow-primary/25">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Payment Gateway & App Surveyors</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                1-Click
              </span>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Skip registration and test the complete live portal with our verified reviewer account.
            </p>
            <button
              type="button"
              onClick={handleReviewerClick}
              disabled={reviewerLoading || loading}
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

      <div className="glass-card p-6 md:p-8 space-y-6 border border-border/80 shadow-xl">
        {/* Toggle Mode */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex p-1 bg-surface-elevated rounded-xl gap-1">
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                setErrorMsg(undefined)
              }}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                if (!signupsAllowed) {
                  setErrorMsg('New account registrations are temporarily paused by administration.')
                  return
                }
                setMode('signup')
                setErrorMsg(undefined)
              }}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground'
              } ${!signupsAllowed ? 'opacity-50' : ''}`}
            >
              Create Account
            </button>
          </div>

          <a
            href={process.env.NEXT_PUBLIC_CMS_URL ? `${process.env.NEXT_PUBLIC_CMS_URL}/login` : 'http://localhost:3001/login'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium px-2.5 py-1 rounded-lg border border-border text-muted hover:text-purple-600 hover:border-purple-300 transition-colors inline-flex items-center gap-1"
            title="Open Admin CMS Operations Console"
          >
            Admin Portal ↗
          </a>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-heading font-bold text-foreground">
            {mode === 'signin' ? 'Welcome to CarryGo' : 'Join CarryGo Today'}
          </h2>
          <p className="text-xs text-muted">
            {mode === 'signin'
              ? 'Sign in to send parcels, offer trips, and track active bookings.'
              : 'Connect with verified travelers and send parcels securely across India.'}
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-danger-subtle border border-danger/20 p-3">
            <p className="text-xs text-danger font-medium">{errorMsg}</p>
          </div>
        )}

        <form
          action={mode === 'signup' ? signup : login}
          onSubmit={() => setLoading(true)}
          className="space-y-4"
        >
          <input type="hidden" name="next" value={nextPath} />

          {mode === 'signup' && (
            <>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-foreground">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    name="fullName"
                    type="text"
                    required
                    placeholder="Rohit Sharma"
                    className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-foreground">Phone Number (Optional)</label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="block w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-foreground">Email Address</label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="block w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-foreground">Password</label>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••••••"
                className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-hover active:scale-[0.98] transition-all shadow-md shadow-primary/20 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : mode === 'signup' ? (
              <>
                Create Free Account
                <UserPlus className="w-4 h-4" />
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-muted text-center leading-relaxed">
          By signing in, you agree to CarryGo&apos;s{' '}
          <a href="/terms-and-conditions" className="text-primary hover:underline">Terms of Service</a>,{' '}
          <a href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</a>, and{' '}
          <a href="/refund-cancellation" className="text-primary hover:underline">Refund Policy</a>.
        </p>
      </div>
    </div>
  )
}
