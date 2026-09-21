import type { MetadataRoute } from 'next'

const routes = [
  '', '/about', '/contact', '/faq', '/features', '/for-senders', '/for-travelers',
  '/how-it-works', '/pricing', '/privacy-policy', '/refund-cancellation', '/safety',
  '/shipping-delivery', '/terms-and-conditions',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://carrygo.in'
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : 0.7,
  }))
}
