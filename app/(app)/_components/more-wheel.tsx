"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useLogoutSheet } from "@/components/logout";
import { useT } from "@/lib/i18n/client";

export interface WheelItem {
  href: string;
  label: string;
  icon: IconName;
  /** this screen, or one under it, is open */
  on: boolean;
  /** what is new there (shown on the button, and summed on the raised button) */
  badge: number;
}

const BADGE_MAX = 99;
/** degrees turned per pixel dragged */
const DRAG = 0.5;

/** Which button faces the viewer at this angle. Button i sits at angle + i·step; the front is where that is 0. */
const frontOf = (angle: number, count: number) => (((Math.round(-angle / (360 / count)) % count) + count) % count);

/**
 * The ghotok's raised "আরও" on the phone bar. It opens a ring of buttons, tilted away like a wheel lying on a table:
 * the one in front is large and lit, the ones behind small and faint. Drag sideways (or turn the mouse wheel, or use
 * the arrow keys) to turn it; it settles on the nearest button. A tap on the front button opens it, a tap on any
 * other turns it to the front. The last button logs out, after asking.
 */
export function MoreWheel({ items }: { items: WheelItem[] }) {
  const { t, n } = useT();
  const pathname = usePathname();
  const logout = useLogoutSheet();
  const [open, setOpen] = useState(false);
  const [front, setFront] = useState(0);
  const count = items.length + 1;
  const step = 360 / count;
  const stage = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLElement | null)[]>([]);
  const angle = useRef(0);
  const raf = useRef(0);
  const moved = useRef(false);

  // a new screen closes the wheel
  const [shownAt, setShownAt] = useState(pathname);
  if (shownAt !== pathname) {
    setShownAt(pathname);
    setOpen(false);
  }

  /** Places every button for the current angle. Runs every frame while turning, so it writes styles directly. */
  const place = useCallback(() => {
    const box = stage.current;
    if (!box) return;
    const w = box.clientWidth, h = box.clientHeight, r = Math.min(120, w * 0.36), f = frontOf(angle.current, count);
    els.current.forEach((el, i) => {
      if (!el) return;
      const th = ((angle.current + i * step) * Math.PI) / 180;
      const depth = Math.cos(th); // 1 in front, -1 at the back
      const x = w / 2 + r * Math.sin(th), y = h * 0.52 + depth * 58;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${(0.58 + 0.21 * (depth + 1)).toFixed(3)})`;
      el.style.opacity = (0.3 + 0.35 * (depth + 1)).toFixed(3);
      el.style.zIndex = String(100 + Math.round(depth * 50));
      el.dataset.front = String(i === f);
    });
    setFront(f);
  }, [count, step]);

  const turnTo = useCallback((target: number) => {
    cancelAnimationFrame(raf.current);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      angle.current = target;
      place();
      return;
    }
    const tick = () => {
      angle.current += (target - angle.current) * 0.2;
      if (Math.abs(target - angle.current) < 0.05) angle.current = target;
      else raf.current = requestAnimationFrame(tick);
      place();
    };
    raf.current = requestAnimationFrame(tick);
  }, [place]);

  /** Turns button i to the front the short way round. */
  const bring = useCallback((i: number) => {
    const base = -i * step;
    turnTo(base + 360 * Math.round((angle.current - base) / 360));
  }, [step, turnTo]);

  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const box = stage.current;
    const escape = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      bring((frontOf(angle.current, count) + (e.deltaY > 0 || e.deltaX > 0 ? 1 : -1) + count) % count);
    };
    const resize = new ResizeObserver(place);
    document.addEventListener("keydown", escape);
    box?.addEventListener("wheel", wheel, { passive: false });
    if (box) resize.observe(box);
    return () => {
      document.removeEventListener("keydown", escape);
      box?.removeEventListener("wheel", wheel);
      resize.disconnect();
      cancelAnimationFrame(raf.current);
    };
  }, [open, bring, count, place]);

  function toggle() {
    if (!open) {
      // open with the current screen in front, or else the first with something new
      const here = items.findIndex((it) => it.on), fresh = items.findIndex((it) => it.badge > 0);
      angle.current = -(here >= 0 ? here : Math.max(0, fresh)) * step;
    }
    setOpen((o) => !o);
  }

  function drag(e: PointerEvent<HTMLDivElement>) {
    const startX = e.clientX, startAngle = angle.current;
    moved.current = false;
    cancelAnimationFrame(raf.current);
    const move = (ev: globalThis.PointerEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 6) moved.current = true;
      angle.current = startAngle + dx * DRAG;
      place();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      turnTo(Math.round(angle.current / step) * step);
      // the click that follows a drag is not a tap
      setTimeout(() => { moved.current = false; }, 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function keys(e: KeyboardEvent<HTMLDivElement>) {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (frontOf(angle.current, count) + dir + count) % count;
    bring(next);
    els.current[next]?.focus({ preventScroll: true });
  }

  /** A tap that is not on the front button turns the wheel instead of following it. */
  function tap(i: number, e: MouseEvent) {
    if (moved.current || frontOf(angle.current, count) !== i) {
      e.preventDefault();
      if (!moved.current) bring(i);
      return;
    }
    if (i === items.length) logout.open();
  }

  const total = items.reduce((sum, it) => sum + it.badge, 0);
  const lit = open || items.some((it) => it.on);
  const shown = (k: number) => (k > BADGE_MAX ? `${n(BADGE_MAX)}+` : n(k));
  const face = (icon: IconName, badge: number, danger: boolean): ReactNode => (
    <span className={`relative grid size-14 place-items-center rounded-full bg-surface shadow-lg group-data-[front=true]:outline-2 group-data-[front=true]:outline-offset-3 group-data-[front=true]:outline-dotted ${danger
      ? "text-neg group-data-[front=true]:bg-neg group-data-[front=true]:text-surface group-data-[front=true]:outline-neg"
      : "text-primary group-data-[front=true]:bg-primary group-data-[front=true]:text-on-primary group-data-[front=true]:outline-gold"}`}>
      <Icon name={icon} size={24} />
      {badge ? <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] leading-none font-bold text-panel ring-2 ring-surface">{shown(badge)}</span> : null}
    </span>
  );
  const button = "group absolute top-0 left-0 grid justify-items-center gap-1 text-xs font-bold text-on-panel will-change-transform focus:outline-none";

  return (
    <li className="flex flex-1 justify-center">
      {open ? (
        <div className="fixed inset-0 z-10">
          <button type="button" aria-hidden tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 bg-shade" />
          <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom)+18.5rem)] text-center text-on-panel">
            <p className="font-display text-3xl font-extrabold">{front === items.length ? t("st.logout") : items[front]?.label}</p>
            <p className="text-xs opacity-80">{t("nav.wheelHint")}</p>
          </div>
          <div ref={stage} id="more-wheel" role="group" aria-label={t("nav.more")} onPointerDown={drag} onKeyDown={keys}
            className="absolute inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] mx-auto h-72 max-w-md cursor-grab touch-none select-none active:cursor-grabbing">
            <span aria-hidden className="absolute top-[52%] left-1/2 h-29 w-[min(240px,72%)] -translate-1/2 rounded-full border-[1.5px] border-dashed border-gold/70" />
            {items.map((it, i) => (
              <Link key={it.href} href={it.href} ref={(el) => { els.current[i] = el; }} aria-current={it.on ? "page" : undefined}
                onClick={(e) => tap(i, e)} onFocus={() => bring(i)} draggable={false} className={button}>
                {face(it.icon, it.badge, false)}
                {it.label}
              </Link>
            ))}
            <button type="button" ref={(el) => { els.current[items.length] = el; }} onClick={(e) => tap(items.length, e)} onFocus={() => bring(items.length)} className={button}>
              {face("logout", 0, true)}
              {t("st.logout")}
            </button>
          </div>
        </div>
      ) : null}
      {logout.sheet}
      <button type="button" onClick={toggle} aria-expanded={open} aria-controls="more-wheel"
        className="relative z-20 flex flex-col items-center gap-0.5 text-[11px] font-bold text-primary">
        <span aria-hidden className={`relative -mt-7 grid size-14 place-items-center rounded-full border-[5px] border-bg shadow-lg ${lit ? "bg-panel text-gold" : "bg-primary text-on-primary"}`}>
          <Icon name={open ? "close" : "more"} size={24} strokeWidth={2.4} />
          {total && !open ? <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1 text-[11px] leading-none font-bold text-panel ring-2 ring-surface">{shown(total)}</span> : null}
        </span>
        {t("nav.more")}
      </button>
    </li>
  );
}
