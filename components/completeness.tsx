import Link from "next/link";
import type { Profile } from "@/lib/db/schema";
import type { T } from "@/lib/i18n";
import { completeness } from "@/lib/profile-fields";

/** How full a family's own biodata is, with what to add next; nothing once it is complete. */
export function Completeness({ p, t: T }: { p: Profile; t: T }) {
  const { percent, missing } = completeness(p);
  if (!missing.length) return null;
  const { t } = T;
  const next = missing.slice(0, 3).map((k) => t(`cp.${k}`)).join(t("cp.sep"));
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-primary-soft px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={t("cp.label")} className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
          <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
        </span>
        <span className="text-xs font-bold text-primary">{T.n(percent)}%</span>
      </div>
      <p className="text-xs text-muted">
        {t("cp.hint", { list: next })}{" "}
        <Link href={`/me/biodata/${p.id}/edit`} className="font-semibold text-primary">{t("cp.add")}</Link>
      </p>
    </div>
  );
}
