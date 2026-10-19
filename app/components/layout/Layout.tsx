import { signOut } from "@agent-native/core/client/sign-out";
import { HeaderActionsProvider } from "@agent-native/toolkit/app-shell";
import {
  IconBooks,
  IconBucket,
  IconChartBar,
  IconChecklist,
  IconFileImport,
  IconLayoutDashboard,
  IconLogout,
  IconMenu2,
  IconMessageCircle,
  IconNotebook,
  IconRoute,
  IconSchool,
  IconSettings,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react";
import { useState } from "react";
import { NavLink } from "react-router";

import { LogoLockup, LogoMark } from "@/components/brand/brand";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useCurrentUser } from "@/hooks/use-current-user";
import { BRAND } from "@/lib/brand";
import { ROLE_LABELS, ROUTE_CAPABILITY, type Role } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export const NAV = [
  { to: "/", label: "Dashboard", icon: IconLayoutDashboard },
  { to: "/my-training", label: "My Training", icon: IconSchool },
  { to: "/courses", label: "Course Library", icon: IconBooks },
  { to: "/buckets", label: "Training Buckets", icon: IconBucket },
  { to: "/learning-paths", label: "Learning Paths", icon: IconRoute },
  { to: "/import", label: "Bulk Import Studio", icon: IconFileImport },
  { to: "/assessments", label: "Assessments", icon: IconChecklist },
  { to: "/sop", label: "SOP & Knowledge Hub", icon: IconNotebook },
  { to: "/coach", label: "AI Training Coach", icon: IconMessageCircle },
  { to: "/skills", label: "Skills & Career Growth", icon: IconTrendingUp },
  { to: "/analytics", label: "Analytics", icon: IconChartBar },
  { to: "/people", label: "People & Teams", icon: IconUsers },
  { to: "/admin", label: "Administration", icon: IconSettings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { me, can } = useCurrentUser();
  const items = NAV.filter(({ to }) => !ROUTE_CAPABILITY[to] || can(ROUTE_CAPABILITY[to]));
  const initials = (me?.name ?? "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="px-5 pb-5 pt-6">
        <LogoLockup className="-ml-2 w-[200px]" />
        <p className="mt-3 border-t border-sidebar-border pt-3 text-[11px] font-medium uppercase tracking-[0.2em] text-sidebar-foreground/70">
          Academy · <span className="text-tsd-gold">{BRAND.descriptor}</span>
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Primary">
        <ul className="space-y-0.5">
          {items.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "relative flex h-10 items-center gap-3 rounded-[3px] px-3 text-[13.5px] transition-colors",
                    isActive
                      ? "bg-sidebar-accent font-medium text-tsd-limestone before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:bg-tsd-gold"
                      : "text-sidebar-foreground/72 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={18} stroke={1.5} className={isActive ? "text-tsd-gold" : "opacity-70"} />
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex items-center gap-3 border-t border-sidebar-border px-5 py-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[3px] bg-tsd-gold text-xs font-semibold text-tsd-charcoal">
          {initials || "·"}
        </span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="block truncate font-medium">{me?.name ?? ""}</span>
          <span className="block truncate text-xs text-sidebar-foreground/60">
            {me ? ROLE_LABELS[me.role as Role] ?? me.role : ""}
          </span>
        </span>
        <button
          type="button"
          onClick={() => signOut()}
          aria-label="Sign out"
          title="Sign out"
          className="flex size-9 items-center justify-center rounded-[3px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <IconLogout size={18} stroke={1.5} />
        </button>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { error } = useCurrentUser();
  if (error) return <NotSetUp message={error.message} />;
  return (
    <HeaderActionsProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <aside className="hidden w-64 shrink-0 lg:block">
          <SidebarContent />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between bg-tsd-charcoal px-4 lg:hidden">
            <div className="flex items-center gap-2">
              <LogoMark className="size-10" />
              <span className="font-display text-lg text-tsd-limestone">{BRAND.appName}</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              className="flex size-11 items-center justify-center text-tsd-limestone"
            >
              <IconMenu2 size={22} />
            </button>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="left" className="w-72 border-none p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <main
            className="agent-native-app-main min-w-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {children}
          </main>
        </div>
      </div>
    </HeaderActionsProvider>
  );
}

function NotSetUp({ message }: { message: string }) {
  const needsInvitation = message.includes("Your account hasn't been set up.");
  return (
    <div className="tsd-pattern flex min-h-screen items-center justify-center bg-tsd-charcoal px-6 text-tsd-limestone">
      <div className="max-w-md text-center">
        <LogoMark className="mx-auto size-20" />
        <h1 className="mt-6 font-display text-4xl">
          {needsInvitation ? "Your account needs an invitation." : "We couldn't load the Academy."}
        </h1>
        <p className="mt-3 text-sm text-tsd-limestone/75">
          {needsInvitation
            ? "Ask your administrator to add your work email in People & Teams, then sign in again."
            : "The server couldn't load your profile. Try again. If this keeps happening, ask your administrator to check the database connection and setup."}
        </p>
        <button
          type="button"
          onClick={() => needsInvitation ? signOut() : window.location.reload()}
          className="mt-8 inline-flex h-11 items-center gap-2 rounded-[3px] bg-tsd-gold px-5 text-sm font-medium text-tsd-charcoal hover:bg-tsd-gold/90"
        >
          {needsInvitation && <IconLogout size={16} />}
          {needsInvitation ? "Sign out" : "Try again"}
        </button>
      </div>
    </div>
  );
}
