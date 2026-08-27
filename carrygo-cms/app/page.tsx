import Link from 'next/link'
import { ArrowRight, Box, PlaneTakeoff, ShieldCheck, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background selection:bg-accent selection:text-white flex flex-col">
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
        <div className="text-2xl font-heading font-bold tracking-tight text-foreground">
          CarryGo<span className="text-primary">.</span>
        </div>
        <Link
          href="/login"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
        >
          Admin Login
          <ArrowRight className="h-4 w-4" />
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center max-w-5xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary-subtle border border-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-8">
          <Sparkles className="h-3.5 w-3.5" />
          Peer-to-peer delivery network
        </div>

        <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] leading-[1.05] font-heading font-bold tracking-tight text-foreground mb-6 max-w-4xl">
          Send parcels with
          <span className="text-primary"> trusted travelers</span>
        </h1>

        <p className="text-lg md:text-xl text-muted max-w-2xl mb-12 leading-relaxed">
          Connect with verified travelers heading your way. Faster delivery, lower costs, complete peace of mind.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="#download"
            className="group flex items-center gap-3 bg-primary text-primary-foreground px-7 py-4 rounded-2xl text-base font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
          >
            Get the App
            <ArrowRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href="#travelers"
            className="px-7 py-4 rounded-2xl text-base font-semibold text-foreground bg-surface border border-border hover:border-primary/30 hover:shadow-md transition-all"
          >
            I&apos;m a Traveler
          </Link>
        </div>
      </main>

      <section className="bg-surface border-t border-border py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-heading font-bold tracking-tight text-foreground">
              How it works
            </h2>
            <p className="text-muted mt-3 text-lg">Three simple steps to send or carry parcels.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-background border border-border-subtle p-8 hover:shadow-lg hover:border-border transition-all duration-300">
              <div className="w-12 h-12 bg-primary-subtle rounded-2xl flex items-center justify-center text-primary mb-5">
                <Box className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-foreground mb-3">Post a Parcel</h3>
              <p className="text-muted leading-relaxed">
                Enter your package details and destination. Get matched with verified travelers on that route instantly.
              </p>
            </div>

            <div className="rounded-2xl bg-background border border-border-subtle p-8 hover:shadow-lg hover:border-border transition-all duration-300">
              <div className="w-12 h-12 bg-success-subtle rounded-2xl flex items-center justify-center text-success mb-5">
                <PlaneTakeoff className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-foreground mb-3">Match & Meet</h3>
              <p className="text-muted leading-relaxed">
                Chat securely, arrange a handover, and let the traveler carry your package on their journey.
              </p>
            </div>

            <div className="rounded-2xl bg-background border border-border-subtle p-8 hover:shadow-lg hover:border-border transition-all duration-300">
              <div className="w-12 h-12 bg-accent-subtle rounded-2xl flex items-center justify-center text-accent mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-heading font-semibold text-foreground mb-3">Safe Delivery</h3>
              <p className="text-muted leading-relaxed">
                Track status and verify delivery with secure OTP. Everyone is KYC verified for absolute safety.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-background py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-lg font-heading font-bold tracking-tight text-foreground">
            CarryGo<span className="text-primary">.</span>
          </div>
          <div className='flex flex-wrap justify-center gap-4 text-sm'>
            <Link href='/privacy-policy' className='text-muted hover:text-primary transition-colors'>Privacy Policy</Link>
            <Link href='/terms-and-conditions' className='text-muted hover:text-primary transition-colors'>Terms and Conditions</Link>
            <Link href='/refund-cancellation' className='text-muted hover:text-primary transition-colors'>Refund and Cancellation</Link>
            <Link href='/shipping-delivery' className='text-muted hover:text-primary transition-colors'>Shipping and Delivery</Link>
          </div>
          <p className="text-sm text-muted">
            &copy; 2026 CarryGo Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}

