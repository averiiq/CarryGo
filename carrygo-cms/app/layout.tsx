import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://carygoo.in'),
  title: {
    default: "CaryGoo — Intercity Parcel Delivery at the Speed of Real Travel",
    template: "%s — CaryGoo",
  },
  description:
    "CaryGoo connects verified intercity travelers with senders for secure, same-day, and 60% cheaper parcel deliveries across India.",
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'CaryGoo',
    title: 'CaryGoo — Intercity Parcel Delivery at the Speed of Real Travel',
    description: 'Send urgent parcels in hours or monetize empty luggage space with verified travelers across India.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CaryGoo — Intercity Parcel Delivery at the Speed of Real Travel',
    description: 'Send urgent parcels in hours or monetize empty luggage space with verified travelers across India.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      style={{ colorScheme: 'light' }}
      className="h-full antialiased"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground selection:bg-emerald-500/20 selection:text-emerald-800">
        {children}
      </body>
    </html>
  );
}
