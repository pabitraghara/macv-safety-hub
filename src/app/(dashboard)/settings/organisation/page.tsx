"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useMyOrganisation } from "@/api/organisation";
import type { UpdateOrganisationRequest } from "@/api/organisation";
import { ApiError } from "@/api/base/errors";

export default function OrganisationPage() {
  const { org, loading, error, update } = useMyOrganisation();

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [sendOwnerEmail, setSendOwnerEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canManage, setCanManage] = useState(true);

  const hasVehicles = org?.enabled_modules?.includes("vehicles") ?? false;

  useEffect(() => {
    if (org) {
      setName(org.name);
      setWebsite(org.website ?? "");
      setContactInfo(org.contact_info ?? "");
      setSendOwnerEmail(org.send_owner_email ?? false);
    }
  }, [org]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: UpdateOrganisationRequest = {
        name: name.trim() || undefined,
        website: website.trim() || null,
        contact_info: contactInfo.trim() || null,
        ...(hasVehicles ? { send_owner_email: sendOwnerEmail } : {}),
      };
      await update(payload);
      toast.success("Organisation updated");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setCanManage(false);
        toast.error("You don't have permission to update organisation details");
      } else {
        toast.error(
          err instanceof Error ? err.message : "Failed to update organisation",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Organisation</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your organisation details.
        </p>
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Read-only system fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Org Code</Label>
            {loading ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              <p className="text-muted-foreground font-mono text-sm">
                {org?.org_code}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Org ID</Label>
            {loading ? (
              <Skeleton className="h-5 w-full" />
            ) : (
              <p className="text-muted-foreground truncate font-mono text-xs">
                {org?.id}
              </p>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="org-name">Name</Label>
          {loading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canManage}
              required
            />
          )}
        </div>

        {/* Website */}
        <div className="space-y-1.5">
          <Label htmlFor="org-website">Website</Label>
          {loading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Input
              id="org-website"
              type="url"
              placeholder="https://example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              disabled={!canManage}
            />
          )}
        </div>

        {/* Contact Info */}
        <div className="space-y-1.5">
          <Label htmlFor="org-contact">Contact Info</Label>
          {loading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Input
              id="org-contact"
              placeholder="Phone number, email, or other contact details"
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              disabled={!canManage}
            />
          )}
        </div>

        {/* Vehicle-owner violation emails (Vehicles module only) */}
        {hasVehicles && (
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="org-send-owner-email">
                Email vehicle owners on speed violations
              </Label>
              <p className="text-muted-foreground text-sm">
                Send the registered owner of the vehicle their own notification
                email for each violation, in addition to your alert-policy
                recipients. Requires the plate to exist in Vehicle Registrations
                with an owner email.
              </p>
            </div>
            {loading ? (
              <Skeleton className="h-5 w-9" />
            ) : (
              <Switch
                id="org-send-owner-email"
                checked={sendOwnerEmail}
                onCheckedChange={setSendOwnerEmail}
                disabled={!canManage}
              />
            )}
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
