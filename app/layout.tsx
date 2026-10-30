import type { Metadata, Viewport } from "next";
// Fonts are self-hosted from npm packages: no request to Google at build time or at runtime.
import "@fontsource/hind-siliguri/400.css";
import "@fontsource/hind-siliguri/500.css";
import "@fontsource/hind-siliguri/600.css";
import "@fontsource/hind-siliguri/700.css";
import "@fontsource/baloo-da-2/700.css";
import "@fontsource/baloo-da-2/800.css";
import "./globals.css";
import { ServiceWorker } from "@/components/pwa";
import { ThemeSync } from "@/components/theme";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: { default: "আলতা", template: "%s · আলতা" },
  applicationName: "আলতা",
  description: "গ্রামের ঘটকের ডিজিটাল খাতা: পাত্র-পাত্রী, প্রস্তাব আর হিসাব এক জায়গায়।",
  // the phone-app side: app/manifest.ts and the icons in public/ (npm run icons)
  manifest: "/manifest.webmanifest",
  icons: { apple: "/apple-icon.png" },
  appleWebApp: { capable: true, title: "আলতা", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#14161d" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bn" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full font-sans">
        {/* applies a saved light/dark choice before anything paints; see lib/theme.ts */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {children}
        <ServiceWorker />
        <ThemeSync />
      </body>
    </html>
  );
}
