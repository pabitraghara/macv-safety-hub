"use client";

import { useState } from "react";
import PageHeader from "@/components/common/PageHeader";
import AccessListPanel from "@/components/domain/vehicles/AccessListPanel";
import { cn } from "@/lib/utils";

type AccessTab = "whitelist" | "blacklist";

export default function AccessListPage() {
  const [tab, setTab] = useState<AccessTab>("whitelist");

  const tabs: { value: AccessTab; label: string }[] = [
    { value: "whitelist", label: "Whitelist" },
    { value: "blacklist", label: "Blacklist" },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <PageHeader
        title="Access List"
        description="Manage vehicle whitelist and blacklist settings."
      />

      <div className="bg-muted text-muted-foreground mb-4 inline-flex h-9 items-center rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              "inline-flex h-7 items-center rounded-md px-3 text-sm font-medium transition-colors",
              tab === t.value
                ? "bg-background text-foreground shadow-sm"
                : "hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AccessListPanel variant={tab} />
    </div>
  );
}
