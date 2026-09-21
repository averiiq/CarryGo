import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Outfit } from "next/font/google";
import "./globals.css";

const sansFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const headingFont = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://carrygo.in'),
  title: {
    default: "CarryGo — Intercity Parcel Delivery at the Speed of Real Travel",
    template: "%s — CarryGo",
  },
  description:
    "CarryGo connects verified intercity travelers with senders for secure, same-day, and 60% cheaper parcel deliveries across India.",
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'CarryGo',
    title: 'CarryGo — Intercity Parcel Delivery at the Speed of Real Travel',
    description: 'Send urgent parcels in hours or monetize empty luggage space with verified travelers across India.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CarryGo — Intercity Parcel Delivery at the Speed of Real Travel',
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
      className={`${sansFont.variable} ${headingFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground selection:bg-emerald-500/20 selection:text-emerald-800">
        {children}
      </body>
    </html>
  );
}
