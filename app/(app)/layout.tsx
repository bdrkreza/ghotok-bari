import Link from "next/link";
import { Icon } from "@/components/icons";
import { Nav, TopNav } from "@/components/nav";
import { ThemeButton } from "@/components/theme";
import { requireUser } from "@/lib/auth/session";

/** Every signed-in screen. Phone: a slim top bar, the page, and the tab bar along the bottom.
 *  Wide screen (lg, 1024px and up): a bar across the top with the same screens and who is signed in, and a wider page; no tab bar. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <TopNav userName={user.name} />
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur lg:hidden">
        <div className="mx-auto flex h-14 max-w-md items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-extrabold">
            <span aria-hidden className="grid size-8 place-items-center rounded-xl bg-primary text-base text-on-primary">আ</span>
            আলতা
          </Link>
          <div className="flex items-center gap-1">
            <ThemeButton />
            <Link href="/settings" className="flex items-center gap-2 rounded-xl px-2 py-1 text-sm font-semibold text-muted">
              <span className="max-w-32 truncate">{user.name}</span>
              <Icon name="settings" size={20} />
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:max-w-6xl lg:gap-6 lg:px-8 lg:py-8">
        {children}
      </main>
      <Nav />
    </div>
  );
}
