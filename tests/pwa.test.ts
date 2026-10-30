import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";

// The phone-app side: a manifest that points at icons which really ship, and shortcuts that stay inside the app.
describe("web app manifest", () => {
  const m = manifest();

  it("ships every icon it names, including a maskable one for Android", () => {
    expect(m.icons?.length).toBeGreaterThan(0);
    for (const icon of m.icons ?? []) expect(existsSync(`public${icon.src}`), icon.src).toBe(true);
    expect(m.icons?.some((i) => i.purpose === "maskable")).toBe(true);
  });

  it("opens full-screen at the dashboard and keeps shortcuts inside its scope", () => {
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.scope).toBe("/");
    for (const s of m.shortcuts ?? []) expect(s.url.startsWith("/")).toBe(true);
  });
});
