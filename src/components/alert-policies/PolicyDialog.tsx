"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useContacts } from "@/api/alert-policies";
import type {
  AlertMatch,
  AlertPolicy,
  AlertSchedule,
  AlertTriggerType,
  CreatePolicyRequest,
  RecipientInput,
  UpdatePolicyRequest,
} from "@/api/alert-policies";
import { alertPoliciesApi } from "@/api/alert-policies";
import { teamApi } from "@/api/team/api";
import type { OrgMember } from "@/api/team/types";
import type { Site } from "@/api/sites/types";
import { ConditionFields } from "./ConditionFields";
import { ScheduleEditor } from "./ScheduleEditor";
import { CooldownField } from "./CooldownField";
import { RecipientPicker, type RecipientDraft } from "./RecipientPicker";

export interface PolicyDialogProps {
  open: boolean;
  policy: AlertPolicy | null; // null => create
  sites: Site[]; // for the site selector + names
  availableTriggers: AlertTriggerType[]; // gated families for the trigger selector
  onClose: () => void;
  onSaved: () => void; // call after a successful create/update; parent refetches
}

const ORG_WIDE = "__org__";

const TRIGGER_LABELS: Record<AlertTriggerType, string> = {
  safety: "Safety observation",
  speed_violation: "Speed violation",
  alpr: "ALPR",
};

function draftToRecipientInput(draft: RecipientDraft): RecipientInput {
  if (draft.target_id) {
    return { target_id: draft.target_id, channels: draft.channels };
  }
  if (draft.sourceType === "external") {
    return {
      target_type: "external",
      email: draft.email,
      label: draft.label,
      phone: draft.phone,
      channels: draft.channels,
    };
  }
  return {
    target_type: "user",
    target_ref: draft.target_ref,
    label: draft.label,
    channels: draft.channels,
  };
}

function policyToRecipientDrafts(policy: AlertPolicy): RecipientDraft[] {
  return policy.recipients.map((r) => ({
    key: r.id,
    target_id: r.target_id,
    target_type: r.target?.target_type,
    target_ref: r.target?.target_ref ?? undefined,
    label: r.target?.label ?? undefined,
    email: r.target?.email ?? undefined,
    phone: r.target?.phone ?? undefined,
    channels: r.channels,
    displayName: r.target?.label ?? r.target?.email ?? "Unknown recipient",
    sourceType: r.target?.target_type === "external" ? "external" : "contact",
  }));
}

export function PolicyDialog({
  open,
  policy,
  sites,
  availableTriggers,
  onClose,
  onSaved,
}: PolicyDialogProps) {
  const isEditing = policy != null;
  const { contacts } = useContacts();
  const [members, setMembers] = useState<OrgMember[]>([]);

  const [step, setStep] = useState<"rule" | "recipients">("rule");
  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<AlertTriggerType>(
    availableTriggers[0] ?? "safety",
  );
  const [siteSentinel, setSiteSentinel] = useState<string>(ORG_WIDE);
  const [match, setMatch] = useState<AlertMatch>({});
  const [schedule, setSchedule] = useState<AlertSchedule | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [recipients, setRecipients] = useState<RecipientDraft[]>([]);

  const [nameError, setNameError] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    teamApi
      .getMembers()
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setStep("rule");
    setNameError(null);
    setMatchError(null);
    setScheduleError(null);
    if (policy) {
      setName(policy.name);
      setTriggerType(policy.trigger_type);
      setSiteSentinel(policy.site_id ?? ORG_WIDE);
      setMatch(policy.match);
      setSchedule(policy.schedule);
      setCooldownSeconds(policy.cooldown_seconds);
      setIsActive(policy.is_active);
      setRecipients(policyToRecipientDrafts(policy));
    } else {
      setName("");
      setTriggerType(availableTriggers[0] ?? "safety");
      setSiteSentinel(ORG_WIDE);
      setMatch({});
      setSchedule(null);
      setCooldownSeconds(null);
      setIsActive(true);
      setRecipients([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, policy]);

  function validateRule(): boolean {
    let valid = true;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError("Name is required.");
      valid = false;
    } else {
      setNameError(null);
    }

    if (
      triggerType === "speed_violation" &&
      match.min_overspeed !== undefined &&
      (!Number.isFinite(match.min_overspeed) || match.min_overspeed < 0)
    ) {
      setMatchError("Enter a value of 0 or more.");
      valid = false;
    } else {
      setMatchError(null);
    }

    // The backend enforces `days: min_length=1` on every ScheduleWindow, so a
    // window with no selected days 422s on submit. Gate it client-side here
    // (ScheduleEditor already surfaces a per-window inline warning).
    if (schedule && schedule.windows.some((w) => w.days.length === 0)) {
      setScheduleError(
        "Every schedule window needs at least one day selected.",
      );
      valid = false;
    } else {
      setScheduleError(null);
    }

    return valid;
  }

  function handleNext() {
    if (!validateRule()) return;
    setStep("recipients");
  }

  async function handleSave() {
    if (!validateRule()) {
      setStep("rule");
      return;
    }
    setSaving(true);
    try {
      const siteId = siteSentinel === ORG_WIDE ? null : siteSentinel;
      if (!isEditing) {
        const payload: CreatePolicyRequest = {
          name: name.trim(),
          site_id: siteId,
          trigger_type: triggerType,
          match,
          schedule,
          cooldown_seconds: cooldownSeconds,
          is_active: isActive,
          recipients: recipients.map(draftToRecipientInput),
        };
        await alertPoliciesApi.createPolicy(payload);
        toast.success("Alert created");
      } else {
        const updatePayload: UpdatePolicyRequest = {
          name: name.trim(),
          site_id: siteId,
          match,
          schedule,
          cooldown_seconds: cooldownSeconds,
          is_active: isActive,
        };
        await alertPoliciesApi.updatePolicy(policy!.id, updatePayload);
        await reconcileRecipients(policy!);
        toast.success("Alert updated");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save alert");
    } finally {
      setSaving(false);
    }
  }

  async function reconcileRecipients(existingPolicy: AlertPolicy) {
    const existingByTargetId = new Map(
      existingPolicy.recipients.map((r) => [r.target_id, r]),
    );
    const keptTargetIds = new Set(
      recipients.filter((d) => d.target_id).map((d) => d.target_id as string),
    );

    // A draft is a real addition if it has no target_id at all (a brand-new
    // inline user/external contact) OR it references a target that isn't
    // already a recipient of THIS policy (e.g. an existing contact-book entry
    // or team member picked fresh in this edit). Filtering on `!d.target_id`
    // alone silently dropped the latter — they were never sent to the backend.
    const additions = recipients.filter(
      (d) => !d.target_id || !existingByTargetId.has(d.target_id),
    );
    const removals = existingPolicy.recipients.filter(
      (r) => !keptTargetIds.has(r.target_id),
    );
    const channelChanges = recipients.filter((d) => {
      if (!d.target_id) return false;
      const existing = existingByTargetId.get(d.target_id);
      if (!existing) return false;
      return (
        existing.channels.length !== d.channels.length ||
        existing.channels.some((c) => !d.channels.includes(c))
      );
    });

    if (additions.length > 0) {
      await alertPoliciesApi.addRecipients(
        existingPolicy.id,
        additions.map(draftToRecipientInput),
      );
    }
    for (const removal of removals) {
      await alertPoliciesApi.deleteRecipient(existingPolicy.id, removal.id);
    }
    for (const changed of channelChanges) {
      const existing = existingByTargetId.get(changed.target_id as string)!;
      await alertPoliciesApi.updateRecipient(existingPolicy.id, existing.id, {
        channels: changed.channels,
      });
    }
  }

  const hasNoRecipients = recipients.length === 0;
  const hasChannelErrors = recipients.some((r) => r.channels.length === 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit alert" : "New alert"}</DialogTitle>
          <DialogDescription>
            {step === "rule"
              ? "Define the condition that triggers this alert."
              : "Choose who gets notified."}
          </DialogDescription>
        </DialogHeader>

        {step === "rule" ? (
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="policy-name">Name</Label>
              <Input
                id="policy-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Critical safety incidents"
              />
              {nameError && (
                <p className="text-destructive text-xs">{nameError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Trigger</Label>
              <Select
                value={triggerType}
                onValueChange={(v) => {
                  // Condition shape is trigger-specific; a stale key (e.g. a
                  // safety `min_severity`) sent with a speed trigger 422s on the
                  // backend's `extra="forbid"` match. Reset it on switch.
                  setTriggerType(v as AlertTriggerType);
                  setMatch({});
                  setMatchError(null);
                }}
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTriggers.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TRIGGER_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Site</Label>
              <Select value={siteSentinel} onValueChange={setSiteSentinel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ORG_WIDE}>All sites (org-wide)</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ConditionFields
              triggerType={triggerType}
              value={match}
              onChange={setMatch}
              error={matchError}
            />

            <ScheduleEditor value={schedule} onChange={setSchedule} />
            {scheduleError && (
              <p className="text-destructive text-xs">{scheduleError}</p>
            )}

            <CooldownField
              value={cooldownSeconds}
              onChange={setCooldownSeconds}
            />

            <div className="flex items-center justify-between">
              <Label htmlFor="policy-active">Active</Label>
              <Switch
                id="policy-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            <RecipientPicker
              contacts={contacts}
              members={members}
              value={recipients}
              onChange={setRecipients}
            />
            {hasNoRecipients && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                This alert has no recipients — no one will be notified. You can
                still save and add people later.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "rule" ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={saving}>
                Next: recipients
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("rule")}
                disabled={saving}
              >
                Back
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || hasChannelErrors}
              >
                {isEditing ? "Save changes" : "Create alert"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
