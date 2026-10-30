"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Icon } from "./icons";
import { Card, primaryButton } from "./ui";

/** Registers public/sw.js in production: build assets are cached and an offline page replaces the browser's error.
 *  Development skips it, so hot reload keeps serving fresh files. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {
      /* an old browser or a blocked worker: the app still works, only without the offline page */
    });
  }, []);
  return null;
}

/** Chrome's install event; not in lib.dom. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Chrome fires beforeinstallprompt once, soon after load. It is caught here, when the module loads, so the card
// still gets its one-tap button when the settings page mounts later.
let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferred = null;
    notify();
  });
}

type InstallState = "installed" | "ready" | "ios" | "manual";

function snapshot(): InstallState {
  const standalone = window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (installed || standalone) return "installed";
  if (deferred) return "ready";
  if (/iPhone|iPad|iPod/.test(navigator.userAgent)) return "ios";
  return "manual";
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};

async function install() {
  const e = deferred;
  if (!e) return;
  deferred = null;
  await e.prompt();
  const { outcome } = await e.userChoice;
  if (outcome === "accepted") installed = true;
  notify();
}

/** Settings card that puts আলতা on the home screen: one tap where the browser offers it (Chrome on Android,
 *  Edge and Chrome on a computer), the manual steps elsewhere (Safari on iPhone). */
export function InstallCard() {
  // null on the server and during hydration: the browser is not known yet
  const state = useSyncExternalStore<InstallState | null>(subscribe, snapshot, () => null);
  return (
    <Card title="ফোনে app হিসেবে রাখুন">
      {state === "installed" ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-pos"><Icon name="check" size={18} />আলতা এই ফোনে app হিসেবে আছে।</p>
      ) : (
        <>
          <p className="text-sm text-muted">হোম স্ক্রিনে রাখলে এক টোকায় খাতা খোলে, ব্রাউজারের ঠিকানা-বার ছাড়া পুরো পর্দায় চলে। ইন্টারনেট না থাকলেও app খোলে।</p>
          {state === "ready" ? (
            <button type="button" onClick={install} className={primaryButton}><Icon name="plus" size={18} />ফোনে ইনস্টল করুন</button>
          ) : state === "ios" ? (
            <p className="text-sm">Safari-র নিচের <span className="font-bold">Share</span> বোতাম চাপুন, তারপর <span className="font-bold">Add to Home Screen</span> বেছে নিন।</p>
          ) : state === "manual" ? (
            <p className="text-sm">ব্রাউজারের মেনু (<span className="font-bold">⋮</span>) থেকে <span className="font-bold">Install app</span> বা <span className="font-bold">Add to Home screen</span> বেছে নিন।</p>
          ) : null}
        </>
      )}
    </Card>
  );
}
