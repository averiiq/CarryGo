'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-5">
      <div className="glass-card p-5 border-danger/20">
        <AlertTriangle className="h-8 w-8 text-danger" />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-heading font-semibold text-foreground">Something went wrong</h2>
        <p className="mt-1.5 text-sm text-muted max-w-md">
          {error.message || 'An unexpected error occurred while loading this page.'}
        </p>
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-primary-foreground bg-primary rounded-xl hover:bg-primary-hover transition-all shadow-md shadow-primary/20"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </div>
  )
}
