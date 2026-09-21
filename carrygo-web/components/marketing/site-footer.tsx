import Link from 'next/link'
import {
  CheckCircle2,
  Lock,
  Mail,
  Navigation,
  ShieldCheck,
} from 'lucide-react'
import { footerSections } from '@/components/marketing/site-data'

const POPULAR_CITY_ROUTES = [
  'Mumbai to Pune',
  'Delhi to Jaipur',
  'Bangalore to Hyderabad',
  'Chennai to Bangalore',
  'Delhi to Chandigarh',
  'Ahmedabad to Mumbai',
  'Pune to Goa',
  'Kolkata to Patna',
]

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50/90 px-4 py-14 sm:px-6 sm:py-20 relative overflow-hidden text-slate-600">
      {/* Ambient background glow */}
      <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="mx-auto grid w-full max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-12 relative z-10">
        {/* Brand Column */}
        <div className="space-y-4 sm:col-span-2 lg:col-span-4">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600">
              <Navigation className="h-4 w-4" />
            </div>
            <div className="text-2xl font-heading font-extrabold tracking-tight text-slate-900">
              CarryGo<span className="text-emerald-600">.</span>
            </div>
          </Link>

          <p className="max-w-sm text-xs sm:text-sm leading-relaxed text-slate-600">
            India&apos;s trusted peer-to-peer intercity logistics network. Connecting everyday travelers with urgent parcel senders for same-day delivery at 60% lower rates.
          </p>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <Mail className="w-3.5 h-3.5 text-emerald-600" />
            <a href="mailto:support@carrygo.in" className="hover:text-emerald-700 transition">
              support@carrygo.in
            </a>
          </div>

          {/* System Health Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Systems Normal • 99.9% Handover Success</span>
          </div>
        </div>

        {/* Dynamic City Routes Directory */}
        <div className="space-y-3 lg:col-span-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Active Corridors
          </h3>
          <ul className="grid grid-cols-1 gap-2">
            {POPULAR_CITY_ROUTES.map((route) => {
              const [from, to] = route.split(' to ')
              return (
                <li key={route}>
                  <Link
                    href={`/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}
                    className="text-xs text-slate-600 hover:text-emerald-700 transition flex items-center gap-1.5"
                  >
                    <span className="text-emerald-600/80">→</span>
                    <span>{route}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Platform & Company Navigation Sections */}
        {footerSections.map((section) => (
          <div key={section.title} className="space-y-3 lg:col-span-2 sm:col-span-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              {section.title}
            </h3>
            <ul className="space-y-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-xs text-slate-600 hover:text-emerald-700 transition"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Trust Seals & Security Pillars */}
      <div className="mx-auto mt-12 w-full max-w-7xl pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>100% Aadhaar &amp; Driving License KYC</span>
        </div>
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <Lock className="w-4 h-4 text-sky-600 shrink-0" />
          <span>Dual-OTP Handover &amp; Escrow Protection</span>
        </div>
        <div className="flex items-center justify-center sm:justify-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>₹10,000 Parcel Protection Guarantee</span>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="site-footer-bottom mx-auto mt-8 flex w-full max-w-7xl flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 pt-6 text-[11px] text-slate-500 text-center sm:text-left">
        <p>&copy; 2026 CarryGo Technologies Pvt. Ltd. All rights reserved.</p>
        <p className="flex items-center gap-2">
          <span>Peer-to-Peer Intercity Mobility Architecture</span>
        </p>
      </div>
    </footer>
  )
}
