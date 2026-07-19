import { login } from './actions'
import { ArrowRight, Package } from 'lucide-react'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  const error = params.error

  return (
    <div className="flex min-h-screen relative">
      {/* Background mesh */}
      <div className="fixed inset-0 bg-background">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/6 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-success/4 rounded-full blur-[80px]" />
        </div>
      </div>

      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12">
        <div className="relative max-w-lg space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center shadow-lg shadow-primary/20">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="text-3xl font-heading font-bold text-foreground tracking-tight">CarryGo</span>
          </div>

          <h1 className="text-4xl font-heading font-bold text-foreground tracking-tight leading-tight">
            Admin Control Center
          </h1>
          <p className="text-lg text-muted leading-relaxed">
            Monitor your P2P delivery network, verify users, manage payments, and resolve disputes from one unified dashboard.
          </p>

          <div className="flex gap-8 pt-4">
            <div className="space-y-1">
              <p className="text-3xl font-heading font-bold text-foreground">10K+</p>
              <p className="text-xs text-muted uppercase tracking-wider">Users</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-heading font-bold text-foreground">50+</p>
              <p className="text-xs text-muted uppercase tracking-wider">Cities</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-heading font-bold text-foreground">99.9%</p>
              <p className="text-xs text-muted uppercase tracking-wider">Uptime</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex flex-1 items-center justify-center p-6 relative">
        <div className="w-full max-w-sm">
          <div className="glass-card p-8 space-y-6">
            <div className="space-y-2">
              <div className="lg:hidden flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-heading font-bold text-foreground">CarryGo</span>
              </div>
              <h2 className="text-xl font-heading font-bold text-foreground tracking-tight">
                Welcome back
              </h2>
              <p className="text-sm text-muted">Sign in to access your admin dashboard.</p>
            </div>

            {error && (
              <div className="rounded-xl bg-danger-subtle border border-danger/20 p-3">
                <p className="text-sm text-danger font-medium">
                  {error === 'rate_limited'
                    ? 'Too many attempts. Please try again later.'
                    : 'Invalid email or password. Please try again.'}
                </p>
              </div>
            )}

            <form className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-medium text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="block w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  placeholder="admin@carrygo.com"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-medium text-foreground">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>

              <button
                formAction={login}
                className="group w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-md shadow-primary/20 hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/25 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200"
              >
                Sign in
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
