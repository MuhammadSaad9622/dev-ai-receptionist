"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Phone,
  FileText,
  CalendarClock,
  Siren,
  Settings,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { AlertCountBadge } from "@/components/alert-count-badge";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/interactions", label: "Interactions", icon: Phone },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/appointments", label: "Appointments", icon: CalendarClock },
  { href: "/alerts", label: "Alerts", icon: Siren, badge: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-card/40 p-4">
      <div className="mb-6 px-2">
        <p className="text-sm font-semibold tracking-tight">AI Receptionist</p>
        <p className="text-xs text-muted-foreground">Owner dashboard</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
              isActive(pathname, href)
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            {badge && <AlertCountBadge />}
          </Link>
        ))}
      </nav>
      <Button variant="ghost" size="sm" className="justify-start gap-2 text-muted-foreground" onClick={signOut}>
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </aside>
  );
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 backdrop-blur md:hidden">
      {NAV_ITEMS.map(({ href, label, icon: Icon, badge }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
            isActive(pathname, href) ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
          {badge && (
            <span className="absolute right-1/2 top-1 translate-x-3.5">
              <AlertCountBadge className="h-4 min-w-4 px-0.5 text-[10px]" />
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
