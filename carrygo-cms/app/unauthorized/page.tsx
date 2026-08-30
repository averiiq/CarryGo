import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Access Denied', robots: { index: false, follow: false } }

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-danger mb-4">Unauthorized</h1>
        <p className="text-muted mb-8">
          You do not have the required permissions to access the CarryGo CMS dashboard.
          Please contact an administrator if you believe this is an error.
        </p>
        <Link
          href="/login"
          className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
        >
          Return to Login
        </Link>
      </div>
    </div>
  )
}
