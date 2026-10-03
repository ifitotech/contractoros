import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { I18nProvider } from "@/lib/i18n/provider";
import { ThemeProvider } from "@/lib/theme/provider";
import { defaultLocale, locales, type Locale } from "@/lib/i18n";
import { ServiceWorkerRegister } from "@/components/shared/ServiceWorkerRegister";
import "./globals.css";

async function initialLocale(): Promise<Locale> {
  const saved = (await cookies()).get("bidpower-locale")?.value as Locale | undefined;
  if (saved && locales.includes(saved)) return saved;
  const accepted = ((await headers()).get("accept-language") ?? "").slice(0, 2).toLowerCase();
  return locales.includes(accepted as Locale) ? (accepted as Locale) : defaultLocale;
}

export const metadata: Metadata = {
  title: "BidPower",
  description: "BidPower: tus proyectos, clientes y compras en un solo lugar",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/favicon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/brand/bidpower-icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/icons/apple-touch-icon-152.png", sizes: "152x152", type: "image/png" },
    ],
  },
  applicationName: "BidPower",
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BidPower",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0B1F3B" },
    { media: "(prefers-color-scheme: dark)", color: "#07152B" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await initialLocale();
  return (
    <html lang={locale}>
      <body>
        <ThemeProvider><I18nProvider initialLocale={locale}>{children}</I18nProvider></ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
