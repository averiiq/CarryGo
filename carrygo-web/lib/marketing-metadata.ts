import type { Metadata } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.carygoo.in'
const OG_IMAGE = '/logo-horizontal.png'

export function createMarketingMetadata(
  title: string,
  description: string,
  path: string
): Metadata {
  const url = path.startsWith('http') ? path : `${SITE_URL}${path}`
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url,
      siteName: 'CaryGoo',
      type: 'website',
      locale: 'en_IN',
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE],
    },
  }
}
