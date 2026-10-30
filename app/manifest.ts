import type { MetadataRoute } from "next";

/** Served at /manifest.webmanifest: what a phone needs to put আলতা on the home screen as an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "আলতা: ঘটকের খাতা",
    short_name: "আলতা",
    description: "গ্রামের ঘটকের ডিজিটাল খাতা: পাত্র-পাত্রী, প্রস্তাব আর হিসাব এক জায়গায়।",
    lang: "bn",
    dir: "ltr",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8f6f3",
    theme_color: "#f8f6f3",
    categories: ["productivity", "business"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // long-press the icon on Android
    shortcuts: [
      { name: "নতুন পাত্র", url: "/profiles/new?kind=patro" },
      { name: "নতুন পাত্রী", url: "/profiles/new?kind=patri" },
      { name: "হিসাব", url: "/hisab" },
    ],
  };
}
