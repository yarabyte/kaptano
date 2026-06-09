import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { CookieConsent } from "@/components/marketing/cookie-consent";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: {
    default: "Kaptano — Leads en salon professionnel, foire & exposition",
    template: "%s | Kaptano",
  },
  description:
    "Digitalisez la capture de visiteurs sur vos stands en salon professionnel, foire ou exposition et relancez-les par WhatsApp.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/logo.png", type: "image/png", sizes: "150x150" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kaptano",
  },
};

export const viewport: Viewport = {
  themeColor: "#1677f0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${plusJakarta.variable} font-sans antialiased`}>
        <ServiceWorkerRegister />
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
