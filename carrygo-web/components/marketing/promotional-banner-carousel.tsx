'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Megaphone } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

interface Banner {
  id: string
  type: string
  badge_text: string
  badge_color: string
  title: string
  subtitle: string
  cta_text: string
  cta_action: 'create_parcel' | 'create_trip' | 'open_kyc' | 'matching' | 'link' | 'none'
  deep_link: string | null
  image_url: string | null
}

const ACTION_TO_ROUTE: Record<Banner['cta_action'], string | null> = {
  create_parcel: '/create-parcel',
  create_trip: '/create-trip',
  open_kyc: '/kyc',
  matching: '/matching',
  link: null, // use deep_link
  none: null,
}

export function PromotionalBannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const sb = createClient()
    void (async () => {
      const { data } = await sb
        .from('promotional_banners')
        .select(
          'id, type, badge_text, badge_color, title, subtitle, cta_text, cta_action, deep_link, image_url',
        )
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(5)
      if (data && data.length > 0) setBanners(data as Banner[])
    })()
  }, [])

  useEffect(() => {
    if (banners.length < 2) return
    const timer = setInterval(() => {
      setIdx((i) => (i + 1) % banners.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [banners.length])

  const current = useMemo(() => banners[idx], [banners, idx])

  if (!current) return null

  const target =
    current.cta_action === 'link'
      ? current.deep_link ?? '/'
      : ACTION_TO_ROUTE[current.cta_action] ?? current.deep_link ?? '/'

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 pt-6">
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
        <div className="p-5 sm:p-6 flex items-center gap-4">
          {current.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={current.image_url}
              alt=""
              className="hidden sm:block w-24 h-24 rounded-2xl object-cover shrink-0"
            />
          ) : (
            <span className="hidden sm:flex w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 items-center justify-center shrink-0 border border-emerald-200">
              <Megaphone className="w-6 h-6" />
            </span>
          )}

          <div className="flex-1 min-w-0">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold text-white"
              style={{ backgroundColor: current.badge_color || '#008B48' }}
            >
              {current.badge_text}
            </span>
            <p className="mt-1.5 text-sm sm:text-base font-heading font-semibold text-slate-900 line-clamp-2">
              {current.title}
            </p>
            <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{current.subtitle}</p>
          </div>

          {current.cta_action !== 'none' && target && (
            <Link
              href={target}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800"
            >
              {current.cta_text}
              <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {banners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Banner ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? 'w-6 bg-emerald-600' : 'w-1.5 bg-slate-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
