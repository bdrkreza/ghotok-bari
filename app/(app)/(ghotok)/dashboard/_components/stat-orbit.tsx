"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { Icon, type IconName } from "@/components/icons";
import { useT } from "@/lib/i18n/client";

export interface OrbitStat {
  href: string;
  value: string;
  label: string;
  /** shown beside the label on the wide card */
  icon: IconName;
  tone: keyof typeof TONES;
}

/** Each medallion's face and the edge under it, from the theme's tokens (phone only; the wide card is plain). */
const TONES = {
  sky: "bg-sky text-sky-ink shadow-[0_6px_0_var(--sky-ink),0_14px_22px_var(--shade)]",
  rose: "bg-primary-soft text-primary shadow-[0_6px_0_var(--primary),0_14px_22px_var(--shade)]",
  mango: "bg-mango text-mango-ink shadow-[0_6px_0_var(--mango-ink),0_14px_22px_var(--shade)]",
  mint: "bg-mint text-mint-ink shadow-[0_6px_0_var(--mint-ink),0_14px_22px_var(--shade)]",
};

const COIN = 96; // px, the medallion's size on a phone
/** half the ring's height: far enough that the front medallion clears the hub */
const TILT = 72;
const DRIFT = 0.012; // degrees a millisecond while nobody touches it
const REST = 4000; // ms the orbit waits after a touch before drifting again

const frontOf = (angle: number, count: number) => (((Math.round(-angle / (360 / count)) % count) + count) % count);

/**
 * The home screen's counts as medallions circling a maroon hub, on a tilted ring: the one in front large, the ones
 * behind small and faint. It drifts slowly on its own; a drag turns it (and it settles on the nearest), a tap on a
 * medallion behind brings it round, a tap on the front one opens its list, as does the button under the ring. Still
 * when the phone asks for less motion, and paused while off screen. Wide screens: four plain cards in a row, each with its
 * label and icon, the number, and a link along the foot.
 */
export function StatOrbit({ stats, centre }: { stats: OrbitStat[]; centre: { value: string; label: string } }) {
  const { t } = useT();
  const count = stats.length;
  const step = 360 / count;
  const stage = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLAnchorElement | null)[]>([]);
  const angle = useRef(0);
  const raf = useRef(0);
  const restUntil = useRef(0);
  const dragging = useRef(false);
  const moved = useRef(false);
  /** keyboard focus is on a medallion: the ring holds still so the focused one stays where it is */
  const focused = useRef(false);
  const [front, setFront] = useState(0);
  const [wide, setWide] = useState(false);

  const place = useCallback(() => {
    const box = stage.current;
    if (!box) return;
    if (window.matchMedia("(min-width: 1024px)").matches) {
      els.current.forEach((el) => { if (el) { el.style.transform = ""; el.style.opacity = ""; el.style.zIndex = ""; delete el.dataset.front; } });
      return;
    }
    const w = box.clientWidth, h = box.clientHeight, r = Math.min(112, w * 0.36), f = frontOf(angle.current, count);
    els.current.forEach((el, i) => {
      if (!el) return;
      const th = ((angle.current + i * step) * Math.PI) / 180;
      const depth = Math.cos(th); // 1 in front, -1 behind the hub
      const x = w / 2 + r * Math.sin(th), y = h / 2 + depth * TILT;
      el.style.transform = `translate(${(x - COIN / 2).toFixed(1)}px, ${(y - COIN / 2).toFixed(1)}px) scale(${(0.6 + 0.2 * (depth + 1)).toFixed(3)})`;
      el.style.opacity = (0.35 + 0.325 * (depth + 1)).toFixed(3);
      // in front of the hub (z 100) on the near half, behind it on the far half
      el.style.zIndex = String((depth > 0 ? 150 : 50) + Math.round(depth * 40));
      el.dataset.front = String(i === f);
    });
    setFront(f);
  }, [count, step]);

  /** Glides to a target angle, then goes back to drifting. */
  const glide = useCallback((target: number) => {
    cancelAnimationFrame(raf.current);
    restUntil.current = performance.now() + REST;
    const tick = () => {
      angle.current += (target - angle.current) * 0.18;
      if (Math.abs(target - angle.current) < 0.05) angle.current = target;
      else raf.current = requestAnimationFrame(tick);
      place();
    };
    raf.current = requestAnimationFrame(tick);
  }, [place]);

  const bring = useCallback((i: number) => {
    const base = -i * step;
    glide(base + 360 * Math.round((angle.current - base) / 360));
  }, [glide, step]);

  useLayoutEffect(() => { place(); }, [place]);

  useEffect(() => {
    const box = stage.current;
    if (!box) return;
    const media = window.matchMedia("(min-width: 1024px)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let shown = true, last = performance.now(), drift = 0;
    const onWide = () => { setWide(media.matches); place(); };
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (shown && !media.matches && !dragging.current && !focused.current && now > restUntil.current) {
        angle.current -= dt * DRIFT;
        place();
      }
      drift = requestAnimationFrame(tick);
    };
    const seen = new IntersectionObserver(([e]) => { shown = e.isIntersecting; });
    const resize = new ResizeObserver(place);
    onWide();
    media.addEventListener("change", onWide);
    seen.observe(box);
    resize.observe(box);
    if (!still) drift = requestAnimationFrame(tick);
    return () => {
      media.removeEventListener("change", onWide);
      seen.disconnect();
      resize.disconnect();
      cancelAnimationFrame(drift);
      cancelAnimationFrame(raf.current);
    };
  }, [place]);

  function drag(e: ReactPointerEvent<HTMLDivElement>) {
    if (wide) return;
    const startX = e.clientX, startAngle = angle.current;
    dragging.current = true;
    moved.current = false;
    cancelAnimationFrame(raf.current);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 6) moved.current = true;
      angle.current = startAngle + dx * 0.5;
      place();
    };
    // pointercancel too: the browser takes the gesture over for a scroll, and no pointerup follows
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      dragging.current = false;
      glide(Math.round(angle.current / step) * step);
      setTimeout(() => { moved.current = false; }, 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  /** On a phone, a tap on a medallion behind turns it to the front instead of opening it. Enter on a focused one
   *  (a click with no pointer, detail 0) always opens it. */
  function tap(i: number, e: MouseEvent) {
    if (wide || e.detail === 0) return;
    if (moved.current || frontOf(angle.current, count) !== i) {
      e.preventDefault();
      if (!moved.current) bring(i);
    }
  }

  const current = stats[front];
  return (
    <section aria-label={t("me.glance")} className="flex flex-col items-center gap-1 overflow-hidden rounded-3xl border border-line bg-surface pt-4 pb-4 lg:block lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
      {/* not a live region: it changes every few seconds while the ring drifts */}
      <div className="text-center lg:hidden">
        <p className="font-display text-xl font-bold">{current.value} · {current.label}</p>
        <p className="text-xs text-muted">{t("dash.orbitHint")}</p>
      </div>
      <div ref={stage} onPointerDown={drag}
        onFocus={() => { focused.current = true; }} onBlur={() => { focused.current = false; restUntil.current = performance.now() + REST; }}
        className="relative isolate h-72 w-full touch-pan-y select-none lg:grid lg:h-auto lg:touch-auto lg:grid-cols-4 lg:gap-4">
        <span aria-hidden className="absolute top-1/2 left-1/2 h-36 w-[min(16rem,80%)] -translate-1/2 rounded-full border-[1.5px] border-dashed border-gold/70 lg:hidden" />
        <span aria-hidden className="absolute top-1/2 left-1/2 z-[100] grid size-20 -translate-1/2 place-items-center rounded-full bg-panel text-center text-on-panel shadow-[0_8px_0_var(--wood-lo),0_16px_26px_var(--shade)] lg:hidden">
          <span>
            <span className="block font-display text-2xl leading-none font-extrabold text-gold">{centre.value}</span>
            <span className="block text-[11px] font-bold">{centre.label}</span>
          </span>
        </span>
        {/* hidden on a phone until place() sets them out, so the first paint is not four coins piled in a corner */}
        {stats.map((s, i) => (
          <Link key={s.href} href={s.href} ref={(el) => { els.current[i] = el; }} onClick={(e) => tap(i, e)} onFocus={() => bring(i)} draggable={false}
            className={`group absolute top-0 left-0 grid size-24 place-items-center rounded-full max-lg:opacity-0 text-center will-change-transform data-[front=true]:outline-2 data-[front=true]:outline-offset-4 data-[front=true]:outline-gold data-[front=true]:outline-dotted ${TONES[s.tone]} lg:relative lg:size-auto lg:place-items-stretch lg:rounded-2xl lg:border lg:border-line lg:bg-surface lg:p-5 lg:text-left lg:text-ink lg:shadow-none lg:hover:border-primary/40`}>
            <span className="px-2 lg:flex lg:flex-col lg:gap-3 lg:px-0">
              <span className="block font-display text-4xl leading-none font-extrabold tabular-nums">{s.value}</span>
              <span className="mt-0.5 block text-[11px] leading-tight font-bold text-ink lg:order-first lg:mt-0 lg:flex lg:items-center lg:justify-between lg:gap-2 lg:text-sm lg:text-muted">
                {s.label}
                <span aria-hidden className="hidden size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary lg:grid"><Icon name={s.icon} size={18} /></span>
              </span>
              <span className="hidden items-center gap-1 border-t border-line pt-2.5 text-sm font-bold text-primary lg:flex">
                {t("dash.orbitOpen")}<Icon name="chevronRight" size={16} />
              </span>
            </span>
          </Link>
        ))}
      </div>
      {/* pressing it stops the drift, so the label cannot change under the finger */}
      <Link href={current.href} onPointerDown={() => { restUntil.current = performance.now() + REST; }} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-on-primary lg:hidden">
        {current.label}: {t("dash.orbitOpen")}<Icon name="chevronRight" size={16} />
      </Link>
    </section>
  );
}
