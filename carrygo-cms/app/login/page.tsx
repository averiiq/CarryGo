import { login } from './actions'
import { ArrowRight } from 'lucide-react'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  const error = params.error

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary via-primary/90 to-indigo-700 items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent rounded-full blur-3xl" />
        </div>
        <div className="relative text-white max-w-lg space-y-6">
          <h1 className="text-5xl font-heading font-bold tracking-tight leading-tight">
            CarryGo<br />Admin Portal
          </h1>
          <p className="text-lg text-white/80 leading-relaxed">
            Manage your peer-to-peer delivery network. Monitor trips, verify users, and resolve disputes from one place.
          </p>
          <div className="flex gap-6 pt-4">
            <div className="space-y-1">
              <p className="text-3xl font-heading font-bold">10K+</p>
              <p className="text-sm text-white/60">Active Users</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-heading font-bold">50+</p>
              <p className="text-sm text-white/60">Countries</p>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-heading font-bold">99.9%</p>
              <p className="text-sm text-white/60">Uptime</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <div className="lg:hidden">
              <span className="text-2xl font-heading font-bold text-primary">CarryGo</span>
            </div>
            <h2 className="text-2xl font-heading font-bold text-foreground tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-muted">Sign in to access your admin dashboard.</p>
          </div>

          {error && (
            <div className="rounded-xl bg-danger-subtle border border-danger/20 p-3">
              <p className="text-sm text-danger font-medium">{decodeURIComponent(error)}</p>
            </div>
          )}

          <form className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="block w-full px-4 py-3 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted-foreground shadow-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                placeholder="admin@carrygo.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="block w-full px-4 py-3 rounded-xl border border-border bg-surface text-foreground placeholder:text-muted-foreground shadow-sm focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              formAction={login}
              className="group w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
            >
              Sign in
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
