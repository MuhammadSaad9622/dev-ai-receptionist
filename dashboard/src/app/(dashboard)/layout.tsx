import { DesktopSidebar, MobileBottomNav } from "@/components/nav";
import { EmergencyBanner } from "@/components/emergency-banner";

// Auth itself is enforced by middleware.ts (redirects to /login before any
// page in this group renders) — this layout only owns the visual shell.
export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-full flex-1">
      <DesktopSidebar />
      <div className="flex flex-1 flex-col">
        <EmergencyBanner />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
