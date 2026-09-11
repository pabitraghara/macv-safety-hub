"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardList,
  Bug,
  Settings,
  Video,
  Camera,
  Car,
  Gauge,
  FileText,
  ScanLine,
  Users,
  Map,
  Siren,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { OrgSwitcher } from "@/components/org-switcher";
import { useAuth } from "@/lib/auth-context";
import { Permission } from "@/lib/permissions";
import {
  hasCranesModule,
  hasSafetyModule,
  hasVehiclesModule,
  moduleFromPathname,
  writeLastModule,
} from "@/lib/modules";

type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  items?: { title: string; url: string }[];
};

// ─── Core (always visible) ──────────────────────────────────────────────────
// Rendered immediately regardless of permission state so the sidebar never
// flashes empty while the org-scoped token (and its scopes) are still loading.
const coreItems: NavItem[] = [
  { title: "Home", url: "/", icon: Home },
  // { title: "Cameras", url: "/cameras", icon: Camera },
  { title: "Observations", url: "/observations", icon: ClipboardList },
  // {
  //   title: "Settings",
  //   url: "/settings",
  //   icon: Settings,
  //   items: [
  //     { title: "Organisation", url: "/settings/organisation" },
  //     { title: "Sites", url: "/settings/sites" },
  //     { title: "Team", url: "/settings/team" },
  //     { title: "Alert Policies", url: "/settings/alert-policies" },
  //     { title: "Edge Nodes", url: "/settings/edge-nodes" },
  //     { title: "Cranes", url: "/settings/cranes" },
  //   ],
  // },
];

// ─── Safety module ──────────────────────────────────────────────────────────
const safetyItems: NavItem[] = [
  {
    title: "Videos",
    url: "/videos",
    icon: Video,
    items: [
      { title: "Library", url: "/videos" },
      { title: "Upload", url: "/videos/upload" },
    ],
  },
  { title: "Observations", url: "/observations", icon: ClipboardList },
  { title: "Incidents", url: "/incidents", icon: Bug },
];

/**
 * Build the Vehicles-module nav items, gating each entry on its own scope.
 * Empty result means the current token carries no vehicles read scopes.
 */
function buildVehiclesItems(permissions: Set<string>): NavItem[] {
  const items: NavItem[] = [];

  if (permissions.has(Permission.vehicleView)) {
    items.push({ title: "Overview", url: "/vehicles/overview", icon: Gauge });
    items.push({ title: "Reports", url: "/vehicles/reports", icon: FileText });
  }

  if (permissions.has(Permission.vehicleView)) {
    items.push({
      title: "ALPR",
      url: "/alpr/overview",
      icon: ScanLine,
      items: [
        { title: "Overview", url: "/alpr/overview" },
        { title: "Live Streams", url: "/alpr/live_streams" },
        { title: "ALPR Report", url: "/alpr/alpr_report" },
        ...(permissions.has(Permission.vehicleManage)
          ? [{ title: "OCR Training", url: "/alpr/training" }]
          : []),
      ],
    });
  }

  if (permissions.has(Permission.vehicleView)) {
    items.push({
      title: "Vehicles",
      url: "/vehicles/registry",
      icon: Car,
      items: [
        { title: "Registry", url: "/vehicles/registry" },
        { title: "Access List", url: "/vehicles/access-list" },
      ],
    });
  }

  if (permissions.has(Permission.personView)) {
    items.push({
      title: "People",
      url: "/people",
      icon: Users,
      items: [
        { title: "All People", url: "/people" },
        { title: "Employees", url: "/people/employees" },
        { title: "Constructors", url: "/people/constructors" },
      ],
    });
  }

  return items;
}

/**
 * Build the Cranes-module nav items. The whole section hangs off `crane:view`
 * — both pages read the same data, so there is nothing finer to gate on, and
 * `crane:manage` only unlocks actions inside the pages (acknowledge, resolve,
 * settings) rather than any nav entry of its own.
 */
function buildCranesItems(permissions: Set<string>): NavItem[] {
  if (!permissions.has(Permission.craneView)) return [];
  return [
    { title: "Live map", url: "/cranes/live", icon: Map },
    { title: "Alert history", url: "/cranes/alerts", icon: Siren },
  ];
}

type AppSidebarProps = {
  user: { name: string; email: string };
};

export function AppSidebar({ user }: AppSidebarProps) {
  const { permissions, enabledModules } = useAuth();
  const pathname = usePathname();

  // Track the last-visited module so dual-module clients land where they left off.
  useEffect(() => {
    const activeModule = moduleFromPathname(pathname);
    if (activeModule) writeLastModule(activeModule);
  }, [pathname]);

  // GATE 1 (module/entitlement, org axis): which modules the org is licensed for.
  const showSafety = hasSafetyModule(enabledModules);
  const showVehicles = hasVehiclesModule(enabledModules);
  const showCranes = hasCranesModule(enabledModules);
  // GATE 2 (scope/role axis): each vehicles sub-item stays gated on its own scope.
  const vehiclesItems = showVehicles ? buildVehiclesItems(permissions) : [];
  const cranesItems = showCranes ? buildCranesItems(permissions) : [];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {/* Core is always rendered — no empty-sidebar flash during token load. */}
        <NavMain label="Platform" items={coreItems} />
        {showSafety && <NavMain label="Safety" items={safetyItems} />}
        {vehiclesItems.length > 0 && (
          <NavMain label="Vehicles" items={vehiclesItems} />
        )}
        {cranesItems.length > 0 && (
          <NavMain label="Cranes" items={cranesItems} />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser name={user.name} email={user.email} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
