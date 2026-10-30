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
import { currentSite } from "@/lib/auth/session";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

/** The browser tab carries the ghotok's site name once the site exists; "আলতা" before that and if the database is away. */
export async function generateMetadata(): Promise<Metadata> {
  const site = await currentSite().catch(() => null);
  const name = site?.name ?? "আলতা";
  return {
    title: { default: name, template: `%s · ${name}` },
    applicationName: name,
    description: "ঘটকের নিজের ওয়েবসাইট: পাত্র-পাত্রীর বায়োডাটা, প্রস্তাব আর হিসাব এক জায়গায়।",
    // the phone-app side: app/manifest.ts and the icons in public/ (npm run icons)
    manifest: "/manifest.webmanifest",
    icons: { apple: "/apple-icon.png" },
    appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
  };
}

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
        {/* Applies a saved light/dark choice before anything paints (lib/theme.ts). It runs as the HTML is parsed; React
            only hydrates it. The dev warning about scripts in components appears solely when a server render fails and
            React has to draw the page on the client, where this would not run anyway (ThemeSync then applies the theme). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {children}
        <ServiceWorker />
        <ThemeSync />
      </body>
    </html>
  );
}
