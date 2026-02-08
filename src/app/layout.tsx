import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/AuthContext";
import { CartProvider } from "@/lib/CartContext";
import { SettingsProvider } from "@/lib/SettingsContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// SEO Keywords for Ukhrul/Manipur local discovery
const seoKeywords = [
  "Ukhrul products", "Ukhrul online shopping", "buy Ukhrul products online",
  "Made in Ukhrul", "local products Ukhrul", "Manipur online store",
  "shop local Manipur", "North East India products", "Ukhrul marketplace",
  "3D printing Ukhrul", "custom mugs Manipur", "custom t-shirts Ukhrul",
  "personalized gifts Manipur", "Tangkhul products", "Manipur handicrafts online",
  "Ukhrul artisans", "support local artists Manipur",
].join(", ");

export const metadata: Metadata = {
  metadataBase: new URL("https://innovarc.uk"),
  title: {
    default: "Innovative Archive | Local Products from Ukhrul, Manipur",
    template: "%s | Innovative Archive - Ukhrul",
  },
  description:
    "Shop custom 3D prints, personalized mugs, t-shirts & unique gifts from Ukhrul, Manipur. Made locally by passionate creators. Support Ukhrul artisans. Free delivery in Ukhrul district.",
  keywords: seoKeywords,
  authors: [{ name: "Innovative Archive" }],
  creator: "Innovative Archive",
  publisher: "Innovative Archive",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://innovarc.uk",
    siteName: "Innovative Archive",
    title: "Innovative Archive | Local Products from Ukhrul, Manipur",
    description:
      "Shop custom 3D prints, personalized mugs, t-shirts & unique gifts. Made locally in Ukhrul, Manipur. Support local creators!",
    images: [{ url: "/logo.png", width: 512, height: 512, alt: "Innovative Archive - Ukhrul" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Innovative Archive | Ukhrul, Manipur",
    description: "Custom 3D prints, mugs & t-shirts from Ukhrul. Support local Manipur creators!",
    images: ["/logo.png"],
  },
  other: {
    "geo.region": "IN-MN",
    "geo.placename": "Ukhrul",
    "geo.position": "25.1193;94.3617",
    ICBM: "25.1193, 94.3617",
  },
};

// JSON-LD Structured Data for LocalBusiness
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Innovative Archive",
  description: "Custom 3D printing, personalized mugs, and t-shirts made locally in Ukhrul, Manipur.",
  url: "https://innovarc.uk",
  logo: "https://innovarc.uk/logo.png",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Ukhrul Town",
    addressLocality: "Ukhrul",
    addressRegion: "Manipur",
    postalCode: "795142",
    addressCountry: "IN",
  },
  geo: { "@type": "GeoCoordinates", latitude: 25.1193, longitude: 94.3617 },
  areaServed: [
    { "@type": "Place", name: "Ukhrul District" },
    { "@type": "Place", name: "Manipur" },
    { "@type": "Place", name: "North East India" },
  ],
  priceRange: "₹₹",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* JSON-LD Structured Data for LocalBusiness SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <SettingsProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
