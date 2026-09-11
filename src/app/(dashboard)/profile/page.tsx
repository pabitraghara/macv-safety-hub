"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useMyProfile } from "@/api/user";
import type { UpdateUserProfileRequest } from "@/api/user";

function getInitials(
  first?: string | null,
  last?: string | null,
  email?: string,
) {
  if (first || last) {
    return [first, last]
      .filter(Boolean)
      .map((s) => s![0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return (email?.[0] ?? "U").toUpperCase();
}

export default function ProfilePage() {
  const { profile, loading, error, update } = useMyProfile();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? "");
      setLastName(profile.last_name ?? "");
      setPhoneNumber(profile.phone_number ?? "");
      setEmployeeId(profile.employee_id ?? "");
    }
  }, [profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: UpdateUserProfileRequest = {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone_number: phoneNumber.trim() || null,
        employee_id: employeeId.trim() || null,
      };
      await update(payload);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update profile",
      );
    } finally {
      setSaving(false);
    }
  }

  const initials = getInitials(
    profile?.first_name,
    profile?.last_name,
    profile?.email,
  );

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your personal details.
        </p>
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      {/* Avatar + identity */}
      <div className="mb-6 flex items-center gap-4">
        {loading ? (
          <Skeleton className="h-16 w-16 rounded-full" />
        ) : (
          <Avatar className="h-16 w-16 text-lg">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        )}
        <div className="space-y-0.5">
          {loading ? (
            <>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-1 h-4 w-52" />
            </>
          ) : (
            <>
              <p className="font-medium">
                {[profile?.first_name, profile?.last_name]
                  .filter(Boolean)
                  .join(" ") || profile?.username}
              </p>
              <p className="text-muted-foreground text-sm">{profile?.email}</p>
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Read-only system fields */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>User ID</Label>
            {loading ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <p className="text-muted-foreground truncate font-mono text-xs">
                {profile?.id}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Username</Label>
            {loading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <p className="text-muted-foreground font-mono text-sm">
                {profile?.username}
              </p>
            )}
          </div>
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="first-name">First Name</Label>
            {loading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Input
                id="first-name"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last-name">Last Name</Label>
            {loading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Input
                id="last-name"
                placeholder="Smith"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            )}
          </div>
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number</Label>
          {loading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Input
              id="phone"
              type="tel"
              placeholder="+1 555 000 0000"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          )}
        </div>

        {/* Employee ID */}
        <div className="space-y-1.5">
          <Label htmlFor="employee-id">Employee ID</Label>
          {loading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Input
              id="employee-id"
              placeholder="EMP-001"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            />
          )}
        </div>

        <div className="pt-1">
          <Button type="submit" size="sm" disabled={saving || loading}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
