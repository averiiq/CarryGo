import Link from 'next/link'
import { ArrowRight, Box, PlaneTakeoff, ShieldCheck } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-blue-50 selection:bg-orange-500 selection:text-white flex flex-col">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-8 max-w-7xl mx-auto w-full">
        <div className="text-3xl font-heading font-black tracking-tighter text-blue-900">
          CARRYGO.
        </div>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="font-semibold text-blue-900 hover:text-orange-500 transition-colors"
          >
            Admin Login
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-7xl mx-auto w-full">
        <h1 className="text-[clamp(3rem,8vw,8rem)] leading-[0.9] font-heading font-black tracking-tighter text-blue-900 mb-8 max-w-[1200px]">
          SEND PARCELS.<br />
          <span className="text-blue-600">FASTER. CHEAPER.</span>
        </h1>
        
        <p className="text-xl md:text-3xl font-medium text-blue-800/80 mb-12 max-w-3xl">
          The peer-to-peer delivery network connecting you with trusted travelers heading your way.
        </p>

        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <Link
            href="#download"
            className="group flex items-center justify-center gap-3 bg-orange-500 text-white px-8 py-5 rounded-full text-xl font-bold hover:bg-orange-600 transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_-10px_rgba(249,115,22,0.6)] cursor-pointer"
          >
            Get the App
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="#travelers"
            className="px-8 py-5 rounded-full text-xl font-bold text-blue-900 bg-white border-2 border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
          >
            I&apos;m a Traveler
          </Link>
        </div>
      </main>

      {/* Features Grid */}
      <section className="bg-white py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-[clamp(2.5rem,5vw,5rem)] font-heading font-black tracking-tighter text-blue-900 mb-20">
            HOW IT WORKS.
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-24">
            <div className="flex flex-col gap-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                <Box className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-heading font-bold text-blue-900">1. Post a Parcel</h3>
              <p className="text-lg text-blue-800/70 font-medium">
                Enter your package details and destination. Instantly get matched with verified travelers on that route.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
                <PlaneTakeoff className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-heading font-bold text-blue-900">2. Match & Meet</h3>
              <p className="text-lg text-blue-800/70 font-medium">
                Chat securely, arrange a handover, and let the traveler take your package on their journey.
              </p>
            </div>

            <div className="flex flex-col gap-6">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-500">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h3 className="text-3xl font-heading font-bold text-blue-900">3. Safe Delivery</h3>
              <p className="text-lg text-blue-800/70 font-medium">
                Track status and verify delivery with a secure OTP. Everyone is KYC verified for absolute safety.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-blue-900 text-blue-100 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="text-2xl font-heading font-black tracking-tighter mb-4 md:mb-0">
            CARRYGO.
          </div>
          <p className="font-medium text-blue-300">
            &copy; 2026 CarryGo Inc. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
