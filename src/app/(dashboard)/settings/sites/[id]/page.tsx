"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useSite } from "@/api/sites";
import type { UpdateSiteRequest } from "@/api/sites";
import { ApiError } from "@/api/base/errors";

const TIMEZONE_GROUPS: {
  label: string;
  zones: { value: string; label: string }[];
}[] = [
  {
    label: "Africa",
    zones: [
      { value: "Africa/Cairo", label: "Cairo (UTC+2)" },
      { value: "Africa/Johannesburg", label: "Johannesburg (UTC+2)" },
      { value: "Africa/Lagos", label: "Lagos (UTC+1)" },
      { value: "Africa/Nairobi", label: "Nairobi (UTC+3)" },
    ],
  },
  {
    label: "Americas",
    zones: [
      { value: "America/Anchorage", label: "Anchorage (UTC−9)" },
      { value: "America/Chicago", label: "Chicago (UTC−6)" },
      { value: "America/Denver", label: "Denver (UTC−7)" },
      { value: "America/Los_Angeles", label: "Los Angeles (UTC−8)" },
      { value: "America/Mexico_City", label: "Mexico City (UTC−6)" },
      { value: "America/New_York", label: "New York (UTC−5)" },
      { value: "America/Phoenix", label: "Phoenix (UTC−7)" },
      { value: "America/Santiago", label: "Santiago (UTC−3)" },
      { value: "America/Sao_Paulo", label: "São Paulo (UTC−3)" },
      { value: "America/Toronto", label: "Toronto (UTC−5)" },
      { value: "America/Vancouver", label: "Vancouver (UTC−8)" },
    ],
  },
  {
    label: "Asia",
    zones: [
      { value: "Asia/Bangkok", label: "Bangkok (UTC+7)" },
      { value: "Asia/Colombo", label: "Colombo (UTC+5:30)" },
      { value: "Asia/Dubai", label: "Dubai (UTC+4)" },
      { value: "Asia/Hong_Kong", label: "Hong Kong (UTC+8)" },
      { value: "Asia/Jakarta", label: "Jakarta (UTC+7)" },
      { value: "Asia/Karachi", label: "Karachi (UTC+5)" },
      { value: "Asia/Kolkata", label: "Kolkata (UTC+5:30)" },
      { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (UTC+8)" },
      { value: "Asia/Muscat", label: "Muscat (UTC+4)" },
      { value: "Asia/Riyadh", label: "Riyadh (UTC+3)" },
      { value: "Asia/Seoul", label: "Seoul (UTC+9)" },
      { value: "Asia/Shanghai", label: "Shanghai (UTC+8)" },
      { value: "Asia/Singapore", label: "Singapore (UTC+8)" },
      { value: "Asia/Taipei", label: "Taipei (UTC+8)" },
      { value: "Asia/Tehran", label: "Tehran (UTC+3:30)" },
      { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
    ],
  },
  {
    label: "Atlantic / Middle East",
    zones: [
      { value: "Asia/Beirut", label: "Beirut (UTC+2)" },
      { value: "Asia/Jerusalem", label: "Jerusalem (UTC+2)" },
      { value: "Asia/Kuwait", label: "Kuwait (UTC+3)" },
      { value: "Atlantic/Reykjavik", label: "Reykjavik (UTC+0)" },
    ],
  },
  {
    label: "Australia & Pacific",
    zones: [
      { value: "Australia/Adelaide", label: "Adelaide (UTC+9:30)" },
      { value: "Australia/Brisbane", label: "Brisbane (UTC+10)" },
      { value: "Australia/Melbourne", label: "Melbourne (UTC+10)" },
      { value: "Australia/Perth", label: "Perth (UTC+8)" },
      { value: "Australia/Sydney", label: "Sydney (UTC+10)" },
      { value: "Pacific/Auckland", label: "Auckland (UTC+12)" },
      { value: "Pacific/Honolulu", label: "Honolulu (UTC−10)" },
    ],
  },
  {
    label: "Europe",
    zones: [
      { value: "Europe/Amsterdam", label: "Amsterdam (UTC+1)" },
      { value: "Europe/Athens", label: "Athens (UTC+2)" },
      { value: "Europe/Berlin", label: "Berlin (UTC+1)" },
      { value: "Europe/Brussels", label: "Brussels (UTC+1)" },
      { value: "Europe/Bucharest", label: "Bucharest (UTC+2)" },
      { value: "Europe/Dublin", label: "Dublin (UTC+0)" },
      { value: "Europe/Helsinki", label: "Helsinki (UTC+2)" },
      { value: "Europe/Istanbul", label: "Istanbul (UTC+3)" },
      { value: "Europe/Lisbon", label: "Lisbon (UTC+0)" },
      { value: "Europe/London", label: "London (UTC+0)" },
      { value: "Europe/Madrid", label: "Madrid (UTC+1)" },
      { value: "Europe/Moscow", label: "Moscow (UTC+3)" },
      { value: "Europe/Paris", label: "Paris (UTC+1)" },
      { value: "Europe/Prague", label: "Prague (UTC+1)" },
      { value: "Europe/Rome", label: "Rome (UTC+1)" },
      { value: "Europe/Stockholm", label: "Stockholm (UTC+1)" },
      { value: "Europe/Warsaw", label: "Warsaw (UTC+1)" },
      { value: "Europe/Zurich", label: "Zurich (UTC+1)" },
    ],
  },
  {
    label: "UTC",
    zones: [{ value: "UTC", label: "UTC (UTC+0)" }],
  },
];

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { site, loading, error, update } = useSite(id);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canManage, setCanManage] = useState(true);

  useEffect(() => {
    if (site) {
      setName(site.name);
      setAddress(site.address ?? "");
      setCity(site.city ?? "");
      setCountry(site.country ?? "");
      setTimezone(site.timezone ?? "");
      setIsActive(site.is_active);
    }
  }, [site]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: UpdateSiteRequest = {
        name: name.trim() || undefined,
        address: address.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        timezone: timezone || null,
        is_active: isActive,
      };
      await update(payload);
      toast.success("Site updated");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setCanManage(false);
        toast.error("You don't have permission to update sites");
      } else {
        toast.error(
          err instanceof Error ? err.message : "Failed to update site",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button
          onClick={() => router.push("/settings/sites")}
          className="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Sites
        </button>
        {loading ? (
          <Skeleton className="h-8 w-48" />
        ) : (
          <h1 className="text-2xl font-semibold">{site?.name ?? "Site"}</h1>
        )}
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Read-only system fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Site ID</Label>
            {loading ? (
              <Skeleton className="h-5 w-full" />
            ) : (
              <p className="text-muted-foreground truncate font-mono text-xs">
                {site?.id}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Org ID</Label>
            {loading ? (
              <Skeleton className="h-5 w-full" />
            ) : (
              <p className="text-muted-foreground truncate font-mono text-xs">
                {site?.org_id}
              </p>
            )}
          </div>
        </div>

        {/* Identifier */}
        <div className="space-y-1.5">
          <Label>Identifier</Label>
          {loading ? (
            <Skeleton className="h-5 w-24" />
          ) : (
            <p className="text-muted-foreground font-mono text-sm">
              {site?.code}
            </p>
          )}
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="site-name">Name</Label>
          {loading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Input
              id="site-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canManage}
              required
            />
          )}
        </div>

        {/* Address */}
        <div className="space-y-1.5">
          <Label htmlFor="site-address">Address</Label>
          {loading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Input
              id="site-address"
              placeholder="123 Main St"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={!canManage}
            />
          )}
        </div>

        {/* City + Country */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="site-city">City</Label>
            {loading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Input
                id="site-city"
                placeholder="Mumbai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!canManage}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="site-country">Country</Label>
            {loading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Input
                id="site-country"
                placeholder="India"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={!canManage}
              />
            )}
          </div>
        </div>

        {/* Timezone */}
        <div className="space-y-1.5">
          <Label htmlFor="site-timezone">Timezone</Label>
          {loading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Select
              value={timezone}
              onValueChange={setTimezone}
              disabled={!canManage}
            >
              <SelectTrigger id="site-timezone">
                <SelectValue placeholder="Select a timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_GROUPS.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel>{group.label}</SelectLabel>
                    {group.zones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Active toggle */}
        {!loading && (
          <div className="flex items-center gap-3">
            <Switch
              id="site-active"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={!canManage}
            />
            <Label htmlFor="site-active" className="cursor-pointer">
              {isActive ? "Active" : "Inactive"}
            </Label>
          </div>
        )}

        {canManage && (
          <div className="pt-1">
            <Button type="submit" size="sm" disabled={saving || loading}>
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
