import Link from 'next/link'
import { Compass, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className='flex min-h-screen items-center justify-center bg-background px-6'>
      <div className='w-full max-w-md text-center'>
        <div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-subtle text-primary'>
          <Compass className='h-8 w-8' strokeWidth={1.75} />
        </div>
        <p className='text-xs font-bold uppercase tracking-[0.18em] text-muted'>
          404 · Route not found
        </p>
        <h1 className='mt-3 font-heading text-3xl font-bold tracking-tight text-foreground'>
          We couldn&apos;t find that page
        </h1>
        <p className='mt-3 text-sm text-muted'>
          The link may be broken, the page may have moved, or you may have mistyped
          the address.
        </p>
        <div className='mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row'>
          <Link href='/' className='button-primary'>
            <Home className='h-4 w-4' />
            Back to home
          </Link>
          <Link href='/search' className='button-secondary'>
            Browse trips
          </Link>
        </div>
      </div>
    </div>
  )
}
