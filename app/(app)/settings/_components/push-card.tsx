"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Card, outlineButton, quietButton } from "@/components/ui";
import { removePushAction, savePushAction, testPushAction } from "@/lib/actions/push";
import { useT } from "@/lib/i18n/client";

type State = "loading" | "unsupported" | "install" | "denied" | "off" | "on";

/** The site's base64url public key as the bytes pushManager.subscribe wants. */
const keyBytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));

/** The worker that receives pushes: the same public/sw.js as the offline page, registered here too, since
 *  components/pwa.tsx registers it only in production. */
const worker = async () => {
  await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
  return navigator.serviceWorker.ready;
};

/**
 * "ফোনে খবর": news on the phone even with the site closed (Web Push, free; lib/push.ts). Per browser: each phone or
 * computer turns it on for itself. An iPhone only offers it once ঘটক বাড়ি is on the home screen. `publicKey` is null when
 * the deployment has no VAPID keys; then the card is not shown.
 */
export function PushCard({ publicKey }: { publicKey: string | null }) {
  const { t } = useT();
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [tested, setTested] = useState(false);

  useEffect(() => {
    let live = true;
    const set = (s: State) => { if (live) setState(s); };
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // Safari on an iPhone has push only for the app on the home screen
        return set(/iPhone|iPad|iPod/.test(navigator.userAgent) ? "install" : "unsupported");
      }
      if (Notification.permission === "denied") return set("denied");
      const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
      // tell the server again: it may have forgotten this browser (a new database, another account signed in here)
      if (sub) await savePushAction(sub.endpoint);
      set(sub ? "on" : "off");
    })().catch(() => set("unsupported"));
    return () => { live = false; };
  }, []);

  if (!publicKey) return null;

  async function turnOn(key: string) {
    setBusy(true);
    try {
      const reg = await worker();
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "off");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
      await savePushAction(sub.endpoint);
      setState("on");
    } catch {
      setState("unsupported");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    try {
      const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
      if (sub) {
        await removePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
      setTested(false);
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      await testPushAction();
      setTested(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title={t("push.cardTitle")}>
      <p className="text-sm text-muted">{t("push.cardText")}</p>
      {state === "on" ? (
        <>
          <p className="flex items-center gap-2 text-sm font-semibold text-pos"><Icon name="check" size={18} />{t("push.on")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={test} disabled={busy} className={quietButton}><Icon name="bell" size={18} />{t("push.test")}</button>
            <button type="button" onClick={turnOff} disabled={busy} className={quietButton}>{t("push.turnOff")}</button>
          </div>
          {tested ? <p role="status" className="text-sm text-muted">{t("push.testSent")}</p> : null}
        </>
      ) : state === "off" ? (
        <button type="button" onClick={() => turnOn(publicKey)} disabled={busy} className={outlineButton}>
          <Icon name="bell" size={18} />{busy ? t("common.wait") : t("push.turnOn")}
        </button>
      ) : state === "denied" ? (
        <p className="text-sm">{t("push.denied")}</p>
      ) : state === "install" ? (
        <p className="text-sm">{t("push.install")}</p>
      ) : state === "unsupported" ? (
        <p className="text-sm">{t("push.unsupported")}</p>
      ) : null}
    </Card>
  );
}
