import type { ProfileKind } from "@/lib/db/schema";

// The round picture on a biodata card. With a photo link it shows the photo; otherwise a silhouette, a hijab
// outline for a patri and head-and-shoulders for a patro, so a glance tells who is who.

function Silhouette({ kind, className = "" }: { kind: ProfileKind; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      {kind === "patri" ? (
        <>
          <path d="M12 2.5c-3.9 0-6.3 3-6.3 6.8v3.4c0 1.6-.6 2.7-1.7 3.8A8.6 8.6 0 0 0 3 21.5h18a8.6 8.6 0 0 0-1-5c-1.1-1.1-1.7-2.2-1.7-3.8V9.3c0-3.8-2.4-6.8-6.3-6.8z" />
          <ellipse cx="12" cy="10.2" rx="2.7" ry="3.3" className="fill-primary-soft" />
        </>
      ) : (
        <>
          <circle cx="12" cy="8" r="4.2" />
          <path d="M3.5 21.5a8.5 8.5 0 0 1 17 0z" />
        </>
      )}
    </svg>
  );
}

export function Avatar({ kind, photoUrl, className = "size-20" }: { kind: ProfileKind; photoUrl?: string | null; className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-primary ring-2 ring-primary/30 ${className}`}>
      {photoUrl ? (
        // a plain <img>: the link may point anywhere, and next/image would need every host listed in config
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="size-full object-cover" />
      ) : (
        <Silhouette kind={kind} className="size-[62%]" />
      )}
    </span>
  );
}
