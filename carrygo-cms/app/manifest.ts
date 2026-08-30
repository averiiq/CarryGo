import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CarryGo',
    short_name: 'CarryGo',
    description: 'Trusted peer-to-peer parcel delivery network.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [{ src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' }],
  }
}
