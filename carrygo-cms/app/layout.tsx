import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://carrygo.in'),
  title: {
    default: "CarryGo - Trusted Parcel Delivery Network",
    template: "%s - CarryGo",
  },
  description:
    "CarryGo connects senders with verified travelers for fast, secure, and affordable parcel delivery.",
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'CarryGo',
    title: 'CarryGo - Trusted Parcel Delivery Network',
    description: 'Send parcels through verified travelers with secure handovers and transparent tracking.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CarryGo - Trusted Parcel Delivery Network',
    description: 'Send parcels through verified travelers with secure handovers and transparent tracking.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
