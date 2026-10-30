import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "./avatar";
import { FilterPanel } from "./filters";
import { Icon, type IconName } from "./icons";
import { Empty, PageHeader, ProfileBadge, primaryButton, quietButton } from "./ui";
import { requireAdmin, requireCustomer } from "@/lib/auth/session";
import { KIND_LABEL, MARITAL, PROFILE_STATUS, RELIGION, biodataNo, bn, heightLabel } from "@/lib/bn";
import { getDb } from "@/lib/db";
import type { MaritalStatus, ProfileKind, ProfileStatus, Religion } from "@/lib/db/schema";
import {
  AGE_RANGES, HEIGHT_RANGES, INCOME_MINS, ageLabel, heightLabelFor, incomeLabel, listHref, parseAmount, parseBand, parseNo, type ListParams,
} from "@/lib/search";
import { browseBiodata } from "@/lib/services/biodata";
import { MARITAL_STATUSES, RELIGIONS, listProfiles, places } from "@/lib/services/profiles";
import { ageFromYear } from "@/lib/time";

/** Who is looking: the ghotok sees everyone in full; a family sees approved people without names, photos or contacts. */
export type Viewer = "admin" | "customer";

const STATUSES: (ProfileStatus | "all")[] = ["active", "all", "engaged", "married", "inactive"];
const text = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");
const pick = <T extends string>(all: readonly T[], v: string): T | undefined => ((all as readonly string[]).includes(v) ? (v as T) : undefined);

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
  const who = viewer === "admin" ? await requireAdmin() : await requireCustomer();
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

  const chips = ([
    ["q", p.q && `“${p.q}”`],
    ["no", no === undefined ? "" : `নম্বর ${bn(no)}`],
    ["age", p.age && `${ageLabel(p.age)} বছর`],
    ["district", p.district],
    ["upazila", p.upazila],
    ["religion", religion ? RELIGION[religion] : ""],
    ["marital", marital ? MARITAL[marital] : ""],
    ["education", p.education],
    ["profession", p.profession],
    ["height", p.height && heightLabelFor(p.height)],
    ["income", p.income && incomeLabel(p.income)],
  ] as [keyof ListParams, string][]).filter(([, label]) => label);
  const href = (over: Partial<ListParams>) => listHref(kind, { ...p, status: viewer === "admin" ? status : "", ...over });
  const without = (key: keyof ListParams) => href({ [key]: "" } as Partial<ListParams>);
  const clearHref = listHref(kind, viewer === "admin" ? { status } : {});
  const addHref = viewer === "admin" ? `/profiles/new?kind=${kind}` : `/me/biodata/new?kind=${kind}`;

  return (
    <>
      <PageHeader title={KIND_LABEL[kind]} sub={viewer === "admin" ? "বায়োডাটা" : "নাম-ছবি গোপন; পছন্দ হলে ঘটককে ফোন করুন"}
        action={viewer === "admin"
          ? <Link href={addHref} className={`${primaryButton} min-h-11 px-3`}><Icon name="plus" size={18} />নতুন</Link>
          : <Link href={addHref} className={`${quietButton} min-h-11 px-3 text-sm`}><Icon name="plus" size={18} />বায়োডাটা দিন</Link>} />

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[17rem_1fr] lg:items-start lg:gap-6">
        <FilterPanel active={chips.length}>
          <form method="get" action={`/${kind}`} className="flex flex-col" role="search">
            {viewer === "admin" ? <input type="hidden" name="status" value={status} /> : null}
            <div className="p-4">
              <label htmlFor="q" className="sr-only">খুঁজুন</label>
              <div className="relative">
                <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
                <input id="q" name="q" defaultValue={p.q} placeholder={viewer === "admin" ? "নাম, গ্রাম বা জেলা…" : "উপজেলা বা জেলা…"} inputMode="search" className={`${SELECT} pl-10`} />
              </div>
            </div>
            <Group icon="groom" title="প্রাথমিক" open>
              <TextField name="no" label="বায়োডাটা নম্বর" value={p.no} placeholder="যেমন: ১২" />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-muted">কাকে খুঁজছেন</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["patro", "patri"] as const).map((k) => (
                    <Link key={k} href={listHref(k, { ...p, status: viewer === "admin" ? status : "" })} aria-current={k === kind ? "page" : undefined}
                      className={`inline-flex min-h-10 items-center justify-center rounded-xl text-sm font-bold ${k === kind ? "bg-primary text-on-primary" : "bg-sunk text-ink"}`}>
                      {KIND_LABEL[k]}
                    </Link>
                  ))}
                </div>
              </div>
              <Select name="age" label="বয়স" value={p.age} blank="সব বয়স" options={AGE_RANGES} />
              <Select name="marital" label="বৈবাহিক অবস্থা" value={p.marital} blank="যেকোনো" options={MARITAL_STATUSES.map((m) => ({ value: m, label: MARITAL[m] }))} />
              <Select name="religion" label="ধর্ম" value={p.religion} blank="যেকোনো" options={RELIGIONS.map((r) => ({ value: r, label: RELIGION[r] }))} />
            </Group>
            <Group icon="location" title="ঠিকানা" open>
              <Select name="district" label="জেলা" value={p.district} blank="সব জেলা" options={districts.map((d) => ({ value: d, label: d }))} />
              <Select name="upazila" label="উপজেলা" value={p.upazila} blank="যেকোনো"
                options={upazilas.map((u) => ({ value: u.upazila, label: p.district ? u.upazila : `${u.upazila}, ${u.district}` }))} />
            </Group>
            <Group icon="school" title="শিক্ষা ও পেশা" open={Boolean(p.education || p.profession)}>
              <TextField name="education" label="শিক্ষা" value={p.education} placeholder="যেমন: এইচএসসি" />
              <TextField name="profession" label="পেশা" value={p.profession} placeholder="যেমন: শিক্ষক" />
            </Group>
            <Group icon="ruler" title="ব্যক্তিগত" open={Boolean(p.height || p.income)}>
              <Select name="height" label="উচ্চতা" value={p.height} blank="যেকোনো" options={HEIGHT_RANGES} />
              {/* income is not shown to families, so they cannot filter by it either */}
              {viewer === "admin" ? <Select name="income" label="মাসিক আয়" value={p.income} blank="যেকোনো" options={INCOME_MINS} /> : null}
            </Group>
            <div className="grid grid-cols-2 gap-2 border-t border-line bg-surface p-3 lg:sticky lg:bottom-0">
              <Link href={clearHref} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-primary text-sm font-bold text-primary">ফিল্টার মুছুন</Link>
              <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-on-primary"><Icon name="search" size={16} />খুঁজুন</button>
            </div>
          </form>
        </FilterPanel>

        <section className="flex min-w-0 flex-col gap-4">
          <div className="rounded-2xl border border-line bg-surface">
            {viewer === "admin" ? (
              <nav aria-label="অবস্থা" className="flex gap-1 overflow-x-auto px-2">
                {STATUSES.map((s) => {
                  const on = s === status;
                  return (
                    <Link key={s} href={href({ status: s })} aria-current={on ? "page" : undefined}
                      className={`-mb-px shrink-0 border-b-2 px-3 py-3 text-sm font-bold ${on ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"}`}>
                      {s === "all" ? "সব" : PROFILE_STATUS[s].label}
                    </Link>
                  );
                })}
              </nav>
            ) : null}
            <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm text-muted ${viewer === "admin" ? "border-t border-line" : ""}`}>
              <span className="flex items-center gap-2"><Icon name="people" size={18} className="text-primary" /><span className="font-bold text-primary">{bn(rows.length)}</span>{" "}জন পাওয়া গেছে</span>
              {chips.map(([key, label]) => (
                <Link key={key} href={without(key)} aria-label={`${label} ছাঁকনি সরান`}
                  className="inline-flex items-center gap-1 rounded-full bg-sunk px-2.5 py-0.5 font-semibold text-ink">
                  {label}<Icon name="close" size={14} />
                </Link>
              ))}
              {chips.length ? <Link href={clearHref} className="font-bold text-primary">সব মুছুন</Link> : null}
            </div>
          </div>

          {rows.length ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {rows.map((r) => <BiodataCard key={r.id} p={r} viewer={viewer} />)}
            </ul>
          ) : (
            <Empty action={chips.length
              ? <Link href={clearHref} className={quietButton}>ফিল্টার মুছুন</Link>
              : viewer === "admin" ? <Link href={addHref} className={primaryButton}><Icon name="plus" size={18} />{KIND_LABEL[kind]} যোগ করুন</Link> : null}>
              {chips.length ? "এই ছাঁকনিতে কাউকে পাওয়া যায়নি।" : viewer === "admin" ? `এখনো কোনো ${KIND_LABEL[kind]} যোগ করা হয়নি।` : `এখনো কোনো ${KIND_LABEL[kind]} তালিকায় নেই।`}
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
function BiodataCard({ p, viewer }: { p: CardRow; viewer: Viewer }) {
  const no = biodataNo(p.kind, p.code);
  const title = viewer === "admin" && p.name ? p.name : no;
  const facts: [IconName, string][] = [
    ["calendar", `${bn(ageFromYear(p.birthYear))} বছর`],
    ["location", [p.upazila, p.district].filter(Boolean).join(", ")],
    ["rings", MARITAL[p.maritalStatus]],
  ];
  if (p.heightCm) facts.push(["ruler", heightLabel(p.heightCm)]);
  if (p.profession) facts.push(["briefcase", p.profession]);
  else if (p.education) facts.push(["school", p.education]);
  return (
    <li className="grid grid-cols-[6.5rem_1fr] overflow-hidden rounded-2xl border border-line bg-surface sm:grid-cols-[7.5rem_1fr]">
      <div className="flex flex-col items-center justify-center gap-3 bg-sunk p-3">
        <Avatar kind={p.kind} photoUrl={viewer === "admin" ? p.photoUrl : null} className="size-18 sm:size-20" />
        <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-muted">{viewer === "admin" ? no : RELIGION[p.religion]}</span>
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
          <Link href={viewer === "admin" ? `/profiles/${p.id}` : `/biodata/${p.id}`} aria-label={`${title}: বায়োডাটা দেখুন`}
            className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary-soft px-3.5 text-sm font-bold text-primary">
            বায়োডাটা<Icon name="chevronRight" size={16} />
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
