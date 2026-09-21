'use client'

import { useState } from 'react'
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldAlert,
} from 'lucide-react'
import { login } from '@/app/login/actions'

interface Props {
  initialError?: string
  nextPath?: string
}

export function LoginForm({ initialError, nextPath = '' }: Props) {
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMsg, setErrorMsg] = useState(
    initialError === 'auth_failed'
      ? 'Authentication failed. Please verify your administrator credentials.'
      : initialError === 'rate_limited'
      ? 'Rate limit exceeded. Too many consecutive attempts. Please wait 1 minute.'
      : initialError
  )

  return (
    <div className="w-full max-w-md mx-auto space-y-5">
      {/* Administrator Sign-In Card */}
      <div className="glass-card p-6 md:p-8 space-y-6 border border-border/80 shadow-2xl rounded-2xl relative">
        {/* Header with Security Badge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-widest uppercase px-2.5 py-1 rounded-md bg-surface-elevated text-muted border border-border/80">
              <Lock className="w-3 h-3 text-primary" />
              RBAC Enforced
            </span>
            <span className="text-[11px] font-mono text-emerald-500 font-medium">
              TLS 1.3 Active
            </span>
          </div>

          <h2 className="text-xl font-heading font-bold text-foreground">
            Platform Administrator Authentication
          </h2>
          <p className="text-xs text-muted leading-relaxed">
            Enter your assigned operations credentials to access the centralized command dashboard.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="rounded-xl bg-danger-subtle border border-danger/25 p-3.5 flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <div className="text-xs text-danger font-medium leading-relaxed">
              {errorMsg}
            </div>
          </div>
        )}

        {/* Credentials Form */}
        <form
          action={login}
          onSubmit={() => setLoading(true)}
          className="space-y-4"
        >
          <input type="hidden" name="next" value={nextPath} />

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground">
              Administrator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@carrygo.com"
                className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-foreground">
                Security Key / Passphrase
              </label>
              <span className="text-[10px] text-muted font-mono">
                Hardware Token / MFA Ready
              </span>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="block w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted-foreground text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-hover text-white font-semibold text-sm hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-primary/25 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying Credentials...
              </>
            ) : (
              <>
                Authenticate & Enter Command Center
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Compliance & Audit Footer */}
        <div className="pt-3 border-t border-border/60 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated border border-border text-[11px] font-medium text-muted">
            <span>🔒 Self-registration disabled • Provisioned by DevSecOps</span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            All administrative sessions are strictly monitored, IP-logged, and encrypted end-to-end.
            Unauthorized access attempts are flagged and geo-reported under the IT Act, 2000.
          </p>
          <div className="text-[10px] text-muted font-mono">
            Need Access Recovery or Account Provisioning? Contact{' '}
            <span className="text-primary hover:underline cursor-pointer">
              devsecops@carrygo.in
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
