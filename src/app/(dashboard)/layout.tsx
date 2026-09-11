"use client";

import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { TimezoneSelector } from "@/components/common/TimezoneSelector";
import { useAuth } from "@/lib/auth-context";
import { TimezoneProvider } from "@/contexts/TimezoneContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Option 1: Comment out or ignore real auth state for demo
  // const { isAuthenticated, isLoading, user, activeOrgId } = useAuth();

  // Temporary Mock Data for direct access
  const user = { name: "Pabitra Ghara", email: "pabitra@macv.ai" };
  const activeOrgId = "mock-org-123";

  return (
    <SidebarProvider>
      <TimezoneProvider>
        <AppSidebar user={user} />
        <SidebarInset key={activeOrgId}>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="ml-auto flex items-center gap-1">
              <TimezoneSelector />
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
        </SidebarInset>
        <Toaster />
      </TimezoneProvider>
    </SidebarProvider>
  );
}
