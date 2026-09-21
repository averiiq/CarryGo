import { LoginForm } from '@/components/auth/login-form'
import {
  Activity,
  FileCheck2,
  Lock,
  Radio,
  ShieldCheck,
  Sparkles,
  Terminal,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Administrative Access | CarryGo Operations Command',
  description:
    'CarryGo Central Administration & Operations Command Gateway. Secure authentication for platform operations, KYC verification, and escrow arbitration.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-screen relative bg-background overflow-hidden selection:bg-primary selection:text-white">
      {/* High-Tech Background Glows & Grid Mesh */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-accent/8 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[180px]" />
      </div>

      {/* Left panel - Executive Branding & Operations Command Highlights */}
      <div className="hidden lg:flex lg:w-7/12 relative items-center justify-center p-12 lg:p-16 border-r border-border/70 z-10">
        <div className="relative max-w-xl space-y-10">
          {/* Top Brand Pill & System Badge */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/30">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-heading font-bold text-foreground tracking-tight">
                  CarryGo
                </span>
                <span className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-md bg-primary/15 text-primary border border-primary/20">
                  CMS CORE
                </span>
              </div>
              <p className="text-xs text-muted font-medium">
                Enterprise Operations Command & Platform Governance
              </p>
            </div>
          </div>

          {/* Main Headline */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-elevated border border-border/80 text-xs font-medium text-muted">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Gateway Online • Secure Cluster IND-MUM-01</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-heading font-extrabold text-foreground tracking-tight leading-[1.15]">
              Mission-Critical Control Center for Platform Governance.
            </h1>
            <p className="text-sm text-muted leading-relaxed max-w-lg">
              Manage nationwide corridor telemetry, adjudicate SafeVault™ escrow disputes, and audit real-time Aadhaar & biometric KYC verifications across India.
            </p>
          </div>

          {/* 2x2 Feature Highlights Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-4 rounded-xl border border-border/70 space-y-2 hover:border-primary/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Radio className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-foreground">Corridor Telemetry</h3>
              <p className="text-[11px] text-muted leading-relaxed">
                Live monitoring of interstate transit lanes, parcel volume, and traveler manifests in real time.
              </p>
            </div>

            <div className="glass-card p-4 rounded-xl border border-border/70 space-y-2 hover:border-primary/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-foreground">Biometric KYC Audit</h3>
              <p className="text-[11px] text-muted leading-relaxed">
                Automated document extraction, liveness matching, and fraud risk score evaluation.
              </p>
            </div>

            <div className="glass-card p-4 rounded-xl border border-border/70 space-y-2 hover:border-primary/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-foreground">SafeVault™ Escrow</h3>
              <p className="text-[11px] text-muted leading-relaxed">
                Dual-OTP release protocol, dispute arbitration, and automated payout reconciliation.
              </p>
            </div>

            <div className="glass-card p-4 rounded-xl border border-border/70 space-y-2 hover:border-primary/40 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-foreground">Zero-Trust Security</h3>
              <p className="text-[11px] text-muted leading-relaxed">
                Role-based access control, tamper-evident audit logging, and encrypted sessions.
              </p>
            </div>
          </div>

          {/* Compliance & Health Status Footer */}
          <div className="pt-6 border-t border-border/60 flex items-center justify-between text-xs text-muted">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold text-foreground">99.98% System Uptime</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded bg-surface border border-border">TLS 1.3 Strict</span>
              <span className="px-2 py-0.5 rounded bg-surface border border-border">SOC2 Type II</span>
              <span className="px-2 py-0.5 rounded bg-surface border border-border">AES-256 GCM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Administrative Login Component */}
      <div className="flex flex-1 items-center justify-center p-6 md:p-12 relative z-10">
        <LoginForm
          initialError={params.error}
          nextPath={params.next}
        />
      </div>
    </div>
  )
}
