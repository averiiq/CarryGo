import { LoginForm } from '@/components/auth/login-form'
import { Package, ShieldCheck, Sparkles, Truck } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | CarryGo Web',
  description: 'Sign in to CarryGo to send parcels, offer trips, and track deliveries across India.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: 'signin' | 'signup'; next?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen relative bg-background">
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/6 rounded-full blur-[120px]" />
      </div>

      {/* Left panel - branding & feature highlights */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 border-r border-border/60">
        <div className="relative max-w-lg space-y-8">
          <a href="/" className="inline-flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-heading font-bold text-foreground tracking-tight">CarryGo</span>
          </a>

          <div className="space-y-3">
            <h1 className="text-4xl font-heading font-bold text-foreground tracking-tight leading-tight">
              Peer-to-Peer Logistics Powered by Verified Travelers
            </h1>
            <p className="text-base text-muted leading-relaxed">
              Send documents, electronics, and essentials interstate in hours instead of days, backed by OTP verification and safe escrow protection.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="glass-card p-4 rounded-xl border border-border/60 space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-sm font-semibold text-foreground">Escrow Protected</p>
              <p className="text-xs text-muted">Travelers receive payout only upon verified OTP confirmation.</p>
            </div>

            <div className="glass-card p-4 rounded-xl border border-border/60 space-y-1.5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <p className="text-sm font-semibold text-foreground">Verified Travelers</p>
              <p className="text-xs text-muted">Government ID & selfie verified travelers delivering on the go.</p>
            </div>
          </div>

          <div className="flex items-center gap-6 pt-4 border-t border-border/60 text-xs text-muted">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Sparkles className="w-4 h-4 text-primary" />
              Live Gateway Ready
            </span>
            <span>• 100% Insured Transit</span>
            <span>• 24/7 Dispute Resolution</span>
          </div>
        </div>
      </div>

      {/* Right panel - authentication component */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-12 relative z-10">
        <LoginForm
          initialError={params.error}
          nextPath={params.next}
        />
      </div>
    </div>
  )
}
