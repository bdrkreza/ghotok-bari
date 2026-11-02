"use client";

import { useId, useRef } from "react";
import { Icon } from "@/components/icons";
import { linkButton, quietButton } from "@/components/ui";
import { logoutAction } from "@/lib/auth/actions";
import { useT } from "@/lib/i18n/client";

/**
 * The question before logging out, in a sheet that rises from the bottom on a phone (a centred box on wide screens),
 * so a stray tap never signs anyone out. A native <dialog>: Escape and a tap on the shade close it. Returns the sheet
 * to render and the function that opens it, for any button that should log out.
 */
export function useLogoutSheet() {
  const { t } = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const sheet = (
    <dialog ref={ref} aria-labelledby={titleId} onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
      className="mx-0 mt-auto mb-0 w-full max-w-none rounded-t-3xl bg-surface p-0 text-ink shadow-lg backdrop:bg-shade lg:m-auto lg:max-w-sm lg:rounded-3xl">
      <div className="flex flex-col gap-3 px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-center lg:pt-5">
        <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-line lg:hidden" />
        <h2 id={titleId} className="font-display text-xl font-bold">{t("st.logoutAsk")}</h2>
        <p className="text-sm text-muted">{t("st.logoutAskText")}</p>
        <form action={logoutAction} className="flex">
          <button type="submit" className={`${linkButton} w-full bg-neg text-surface`}><Icon name="logout" size={18} />{t("st.logoutYes")}</button>
        </form>
        <button type="button" onClick={() => ref.current?.close()} className={quietButton}>{t("st.logoutNo")}</button>
      </div>
    </dialog>
  );
  return { open: () => ref.current?.showModal(), sheet };
}

/** "লগ আউট" at the foot of the settings screen. */
export function LogoutButton() {
  const { t } = useT();
  const { open, sheet } = useLogoutSheet();
  return (
    <>
      <button type="button" onClick={open} className={`${linkButton} w-full border border-neg/40 bg-surface text-neg`}>
        <Icon name="logout" size={18} />{t("st.logout")}
      </button>
      {sheet}
    </>
  );
}

/** The round logout button at the end of the web bar, beside the settings pill. The sheet is a top-layer <dialog>, so
 *  the bar's backdrop-blur cannot trap it. */
export function LogoutIcon({ className = "" }: { className?: string }) {
  const { t } = useT();
  const { open, sheet } = useLogoutSheet();
  return (
    <>
      <button type="button" onClick={open} aria-label={t("st.logout")} title={t("st.logout")}
        className={`grid size-10 shrink-0 place-items-center rounded-full border border-line text-neg hover:border-neg/40 hover:bg-neg-soft ${className}`}>
        <Icon name="logout" size={20} />
      </button>
      {sheet}
    </>
  );
}
