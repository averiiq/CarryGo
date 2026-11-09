'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app] unhandled error:', error)
  }, [error])

  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-6'>
      <div className='w-full max-w-md text-center'>
        <div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger-subtle text-danger'>
          <AlertTriangle className='h-8 w-8' strokeWidth={1.75} />
        </div>
        <p className='text-xs font-bold uppercase tracking-[0.18em] text-muted'>
          Something went wrong
        </p>
        <h1 className='mt-3 font-heading text-3xl font-bold tracking-tight text-foreground'>
          We hit an unexpected error
        </h1>
        <p className='mt-3 text-sm text-muted'>
          You can try again, or head back home. Our team has been notified.
        </p>
        {error.digest && (
          <p className='mt-4 inline-block rounded-full border border-border bg-surface px-3 py-1 font-mono text-[11px] text-muted'>
            Ref · {error.digest}
          </p>
        )}
        <div className='mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row'>
          <button type='button' onClick={() => reset()} className='button-primary'>
            <RefreshCw className='h-4 w-4' />
            Try again
          </button>
          <Link href='/' className='button-secondary'>
            <Home className='h-4 w-4' />
            Home
          </Link>
        </div>
      </div>
    </div>
  )
}
