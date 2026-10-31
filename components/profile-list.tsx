import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "./avatar";
import { FilterPanel } from "./filters";
import { Icon, type IconName } from "./icons";
import { Empty, PageHeader, ProfileBadge, primaryButton, quietButton } from "./ui";
import { requireAdmin, requireCustomer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import type { MaritalStatus, ProfileKind, ProfileStatus, Religion } from "@/lib/db/schema";
import type { T } from "@/lib/i18n";
import { getT } from "@/lib/i18n/server";
import { bandLabel, bandOptions, listHref, parseAmount, parseBand, parseNo, type ListParams } from "@/lib/search";
import { browseBiodata } from "@/lib/services/biodata";
import { MARITAL_STATUSES, RELIGIONS, listProfiles, places } from "@/lib/services/profiles";
import { ageFromYear } from "@/lib/time";

/** Who is looking: the ghotok sees everyone in full; a family sees approved people without names, photos or contacts. */
export type Viewer = "admin" | "customer";

const STATUSES: (ProfileStatus | "all")[] = ["active", "all", "engaged", "married", "inactive"];
const text = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");
const pick = <V extends string>(all: readonly V[], v: string): V | undefined => ((all as readonly string[]).includes(v) ? (v as V) : undefined);

// compact controls for the filter column (the shared Field is sized for forms you fill in)
const SELECT = "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40";

/** What one card needs, whichever viewer: the ghotok's rows carry a name and photo, a family's do not. */
interface CardRow {
  id: string;
  code: number;
  kind: ProfileKind;
  name?: string;
  photoUrl?: string | null;
  birthYear: number;
  heightCm: number | null;
  religion: Religion;
  maritalStatus: MaritalStatus;
  education: string | null;
  profession: string | null;
  upazila: string | null;
  district: string;
  status: ProfileStatus;
}

/** The /patro and /patri screens: a filter column, status tabs with the count (ghotok only), and biodata cards. */
export async function ProfileList({ kind, query, viewer }: { kind: ProfileKind; query: Record<string, string | string[] | undefined>; viewer: Viewer }) {
  const [who, T] = await Promise.all([viewer === "admin" ? requireAdmin() : requireCustomer(), getT()]);
  const { t } = T;
  const p: Required<ListParams> = {
    status: text(query.status), q: text(query.q), no: text(query.no), age: text(query.age), district: text(query.district), upazila: text(query.upazila),
    religion: text(query.religion), marital: text(query.marital), education: text(query.education), profession: text(query.profession),
    height: text(query.height), income: viewer === "admin" ? text(query.income) : "",
  };
  // anything malformed in the URL is dropped, so the chips and the query agree
  const status = viewer === "admin" ? (pick(STATUSES, p.status) ?? "active") : "active";
  if (viewer === "customer") p.status = "";
  const no = parseNo(p.no); if (no === undefined) p.no = "";
  const age = parseBand(p.age); if (!age) p.age = "";
  const height = parseBand(p.height); if (!height) p.height = "";
  const income = parseAmount(p.income); if (income === undefined) p.income = "";
  const religion = pick(RELIGIONS, p.religion); if (!religion) p.religion = "";
  const marital = pick(MARITAL_STATUSES, p.marital); if (!marital) p.marital = "";

  const db = getDb();
  const filter = {
    kind, q: p.q, code: no, ageMin: age?.min, ageMax: age?.max, district: p.district, upazila: p.upazila,
    religion, maritalStatus: marital, education: p.education, profession: p.profession, heightMin: height?.min, heightMax: height?.max,
  };
  const [rows, seen] = await Promise.all([
    viewer === "admin"
      ? listProfiles(db, who.ghotokId, { ...filter, status, incomeMin: income })
      : browseBiodata(db, who.ghotokId, filter),
    places(db, who.ghotokId),
  ]);
  const districts = [...new Set(seen.map((s) => s.district))];
  const upazilas = seen.filter((s): s is { district: string; upazila: string } => Boolean(s.upazila) && (!p.district || s.district === p.district));
  const kindLabel = t(`kind.${kind}`);

  const chips = ([
    ["q", p.q && `“${p.q}”`],
    ["no", no === undefined ? "" : t("list.number2", { n: no })],
    ["age", p.age && `${bandLabel(T, "age", p.age)} ${t("list.age").toLowerCase()}`],
    ["district", p.district],
    ["upazila", p.upazila],
    ["religion", religion ? t(`religion.${religion}`) : ""],
    ["marital", marital ? t(`marital.${marital}`) : ""],
    ["education", p.education],
    ["profession", p.profession],
    ["height", p.height && bandLabel(T, "height", p.height)],
    ["income", p.income && bandLabel(T, "income", p.income)],
  ] as [keyof ListParams, string][]).filter(([, label]) => label);
  const href = (over: Partial<ListParams>) => listHref(kind, { ...p, status: viewer === "admin" ? status : "", ...over });
  const without = (key: keyof ListParams) => href({ [key]: "" } as Partial<ListParams>);
  const clearHref = listHref(kind, viewer === "admin" ? { status } : {});
  const addHref = viewer === "admin" ? `/profiles/new?kind=${kind}` : `/me/biodata/new?kind=${kind}`;

  return (
    <>
      <PageHeader title={kindLabel} sub={viewer === "admin" ? t("list.subAdmin") : t("list.subFamily")}
        action={viewer === "admin"
          ? <Link href={addHref} className={`${primaryButton} min-h-11 px-3`}><Icon name="plus" size={18} />{t("common.new")}</Link>
          : <Link href={addHref} className={`${quietButton} min-h-11 px-3 text-sm`}><Icon name="plus" size={18} />{t("list.give")}</Link>} />

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[17rem_1fr] lg:items-start lg:gap-6">
        <FilterPanel active={chips.length}>
          <form method="get" action={`/${kind}`} className="flex flex-col" role="search">
            {viewer === "admin" ? <input type="hidden" name="status" value={status} /> : null}
            <div className="p-4">
              <label htmlFor="q" className="sr-only">{t("common.search")}</label>
              <div className="relative">
                <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                <input id="q" name="q" defaultValue={p.q} placeholder={viewer === "admin" ? t("list.searchAdmin") : t("list.searchFamily")} inputMode="search" className={`${SELECT} pl-10`} />
              </div>
            </div>
            <Group icon="groom" title={t("list.basic")} open>
              <TextField name="no" label={t("list.number")} value={p.no} placeholder={t("list.numberPlaceholder")} />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-muted">{t("list.lookingFor")}</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["patro", "patri"] as const).map((k) => (
                    <Link key={k} href={listHref(k, { ...p, status: viewer === "admin" ? status : "" })} aria-current={k === kind ? "page" : undefined}
                      className={`inline-flex min-h-10 items-center justify-center rounded-xl text-sm font-bold ${k === kind ? "bg-primary text-on-primary" : "bg-sunk text-ink"}`}>
                      {t(`kind.${k}`)}
                    </Link>
                  ))}
                </div>
              </div>
              <Select name="age" label={t("list.age")} value={p.age} blank={t("list.allAges")} options={bandOptions(T, "age")} />
              <Select name="marital" label={t("form.marital")} value={p.marital} blank={t("list.any")} options={MARITAL_STATUSES.map((m) => ({ value: m, label: t(`marital.${m}`) }))} />
              <Select name="religion" label={t("form.religion")} value={p.religion} blank={t("list.any")} options={RELIGIONS.map((r) => ({ value: r, label: t(`religion.${r}`) }))} />
            </Group>
            <Group icon="location" title={t("list.address")} open>
              <Select name="district" label={t("list.district")} value={p.district} blank={t("list.allDistricts")} options={districts.map((d) => ({ value: d, label: d }))} />
              <Select name="upazila" label={t("list.upazila")} value={p.upazila} blank={t("list.any")}
                options={upazilas.map((u) => ({ value: u.upazila, label: p.district ? u.upazila : `${u.upazila}, ${u.district}` }))} />
            </Group>
            <Group icon="school" title={t("list.eduWork")} open={Boolean(p.education || p.profession)}>
              <TextField name="education" label={t("facts.education")} value={p.education} placeholder={t("list.eduPlaceholder")} />
              <TextField name="profession" label={t("facts.profession")} value={p.profession} placeholder={t("list.profPlaceholder")} />
            </Group>
            <Group icon="ruler" title={t("list.personal")} open={Boolean(p.height || p.income)}>
              <Select name="height" label={t("list.height")} value={p.height} blank={t("list.any")} options={bandOptions(T, "height")} />
              {/* income is not shown to families, so they cannot filter by it either */}
              {viewer === "admin" ? <Select name="income" label={t("list.income")} value={p.income} blank={t("list.any")} options={bandOptions(T, "income")} /> : null}
            </Group>
            <div className="grid grid-cols-2 gap-2 border-t border-line bg-surface p-3 lg:sticky lg:bottom-0">
              <Link href={clearHref} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-primary text-sm font-bold text-primary">{t("list.clear")}</Link>
              <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-on-primary"><Icon name="search" size={16} />{t("common.search")}</button>
            </div>
          </form>
        </FilterPanel>

        <section className="flex min-w-0 flex-col gap-4">
          <div className="rounded-2xl border border-line bg-surface">
            {viewer === "admin" ? (
              <nav aria-label={t("list.status")} className="flex gap-1 overflow-x-auto px-2">
                {STATUSES.map((s) => {
                  const on = s === status;
                  return (
                    <Link key={s} href={href({ status: s })} aria-current={on ? "page" : undefined}
                      className={`-mb-px shrink-0 border-b-2 px-3 py-3 text-sm font-bold ${on ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}>
                      {s === "all" ? t("list.all") : t(`profileStatus.${s}`)}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
            <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm text-muted ${viewer === "admin" ? "border-t border-line" : ""}`}>
              <span className="flex items-center gap-2"><Icon name="people" size={18} className="text-primary" />{t("list.found", { n: rows.length })}</span>
              {chips.map(([key, label]) => (
                <Link key={key} href={without(key)} aria-label={t("list.removeFilter", { label })}
                  className="inline-flex items-center gap-1 rounded-full bg-sunk px-2.5 py-0.5 font-semibold text-ink">
                  {label}<Icon name="close" size={14} />
                </Link>
              ))}
              {chips.length ? <Link href={clearHref} className="font-bold text-primary">{t("list.clearAll")}</Link> : null}
            </div>
          </div>

          {rows.length ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {rows.map((r) => <BiodataCard key={r.id} p={r} viewer={viewer} t={T} />)}
            </ul>
          ) : (
            <Empty action={chips.length
              ? <Link href={clearHref} className={quietButton}>{t("list.clear")}</Link>
              : viewer === "admin" ? <Link href={addHref} className={primaryButton}><Icon name="plus" size={18} />{t("form.addKind", { kind: kindLabel })}</Link> : null}>
              {chips.length ? t("list.noneFiltered") : viewer === "admin" ? t("list.noneAdmin", { kind: kindLabel }) : t("list.noneFamily", { kind: kindLabel })}
            </Empty>
          )}
        </section>
      </div>
    </>
  );
}

/**
 * One person as a biodata card: picture and number on the left, the facts a family asks first on the right.
 * For the ghotok the title is the name and the photo shows; for a family the number is the title and the picture is
 * always the silhouette.
 */
function BiodataCard({ p, viewer, t }: { p: CardRow; viewer: Viewer; t: T }) {
  const no = t.biodataNo(p.kind, p.code);
  const title = viewer === "admin" && p.name ? p.name : no;
  const facts: [IconName, string][] = [
    ["calendar", t.years(ageFromYear(p.birthYear))],
    ["location", [p.upazila, p.district].filter(Boolean).join(", ")],
    ["rings", t.t(`marital.${p.maritalStatus}`)],
  ];
  if (p.heightCm) facts.push(["ruler", t.height(p.heightCm)]);
  if (p.profession) facts.push(["briefcase", p.profession]);
  else if (p.education) facts.push(["school", p.education]);
  return (
    <li className="grid grid-cols-[6.5rem_1fr] overflow-hidden rounded-2xl border border-line bg-surface sm:grid-cols-[7.5rem_1fr]">
      <div className="flex flex-col items-center justify-center gap-3 bg-sunk p-3">
        <Avatar kind={p.kind} photoUrl={viewer === "admin" ? p.photoUrl : null} className="size-18 sm:size-20" />
        <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-muted">{viewer === "admin" ? no : t.t(`religion.${p.religion}`)}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-2.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 truncate font-display text-base font-bold">{title}</h2>
          {viewer === "admin" ? <ProfileBadge status={p.status} /> : null}
        </div>
        <ul className="flex flex-col gap-1.5 text-sm">
          {facts.map(([icon, value]) => (
            <li key={icon} className="flex items-center gap-2.5">
              <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon name={icon} size={13} /></span>
              <span className="min-w-0 truncate">{value}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex justify-end pt-1">
          {/* the title goes into the link's spoken label, so twelve "বায়োডাটা" links are still told apart */}
          <Link href={viewer === "admin" ? `/profiles/${p.id}` : `/biodata/${p.id}`} aria-label={t.t("list.viewAria", { title })}
            className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary-soft px-3.5 text-sm font-bold text-primary">
            {t.t("common.biodata")}<Icon name="chevronRight" size={16} />
          </Link>
        </div>
      </div>
    </li>
  );
}

/** A fold of the filter column. Fields inside a closed fold are still sent with the form. */
function Group({ icon, title, open = false, children }: { icon: IconName; title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="group border-t border-line">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 font-bold [&::-webkit-details-marker]:hidden">
        <Icon name={icon} size={18} className="text-primary" />
        <span className="flex-1">{title}</span>
        <Icon name="chevronRight" size={18} className="text-muted transition-transform group-open:rotate-90" />
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">{children}</div>
    </details>
  );
}

function Select({ name, label, value, blank, options }: {
  name: string; label: string; value: string; blank: string; options: readonly { value: string; label: string }[];
}) {
  const id = `f-${name}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-bold text-muted">{label}</label>
      <select id={id} name={name} defaultValue={value} className={SELECT}>
        <option value="">{blank}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function TextField({ name, label, value, placeholder }: { name: string; label: string; value: string; placeholder: string }) {
  const id = `f-${name}`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-bold text-muted">{label}</label>
      <input id={id} name={name} defaultValue={value} placeholder={placeholder} className={SELECT} />
    </div>
  );
}
