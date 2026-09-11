"use client";

import { useEffect, useMemo, useState } from "react";
import { ConeIcon, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  cranesApi,
  useCranes,
  useCraneSettings,
  type Crane,
} from "@/api/cranes";
import { sitesApi, type Site } from "@/api/sites";
import { ApiError } from "@/api/base/errors";
import { useAuth } from "@/lib/auth-context";
import { Permission } from "@/lib/permissions";
import EmptyState from "@/components/common/EmptyState";
import ErrorAlert from "@/components/common/ErrorAlert";
import DeleteConfirmationModal from "@/components/common/DeleteConfirmationModal";
import { MobileCardList, RecordCard } from "@/components/common/RecordCard";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CraneDialog from "./CraneDialog";
import {
  CRANE_THRESHOLD_BOUNDS,
  CRANE_THRESHOLDS_FORM_DEFAULTS,
  buildCraneThresholds,
  craneThresholdsFormFromSettings,
  type CraneThresholdsForm,
} from "./craneThresholds";

/** Sentinel for "org-wide defaults" — Radix Select needs a non-empty value. */
const ORG_WIDE = "__org__";

const ACTIVE_STYLE: Record<string, string> = {
  active: "border-green-200 bg-green-100 text-green-800",
  inactive: "border-gray-200 bg-gray-100 text-gray-600",
};

/** Edit and delete for one crane, shared by the table row and the mobile card. */
function CraneRowActions({
  crane,
  onEdit,
  onDelete,
}: {
  crane: Crane;
  onEdit: (crane: Crane) => void;
  onDelete: (crane: Crane) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Edit crane ${crane.code}`}
        onClick={() => onEdit(crane)}
      >
        <Pencil className="h-4 w-4" />
        <span className="sr-only">Edit crane {crane.code}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete crane ${crane.code}`}
        onClick={() => onDelete(crane)}
      >
        <Trash2 className="text-destructive h-4 w-4" />
        <span className="sr-only">Delete crane {crane.code}</span>
      </Button>
    </div>
  );
}

function CranesTab({
  canView,
  canManage,
  sites,
}: {
  canView: boolean;
  canManage: boolean;
  sites: Site[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Crane | null>(null);
  const [toDelete, setToDelete] = useState<Crane | null>(null);
  const [deleting, setDeleting] = useState(false);

  // No request without crane:view.
  const {
    data: cranes,
    loading,
    error,
    initialized,
    refetch,
  } = useCranes({ enabled: canView });

  const siteName = (id: string | null) =>
    id === null ? "Org-wide" : (sites.find((s) => s.id === id)?.name ?? "—");

  function edit(crane: Crane) {
    setEditing(crane);
    setDialogOpen(true);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      setDeleting(true);
      await cranesApi.deleteCrane(toDelete.id);
      toast.success(`Crane '${toDelete.code}' deleted`);
      setToDelete(null);
      refetch();
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to delete crane");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          One row per crane. The edge box pulls these — including the router
          credentials — and polls each crane&apos;s GPS.
        </p>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add Crane
          </Button>
        )}
      </div>

      {error && <ErrorAlert message={error} onRetry={refetch} />}

      {!loading && !error && initialized && cranes.length === 0 ? (
        <EmptyState
          title="No cranes"
          message="Add a crane for each machine, then point the edge box at this site."
        />
      ) : (
        <>
          {/* DataTable is hidden below md, so the mobile breakpoint needs its
              own list — the same pairing CraneAlertsTable uses. */}
          <MobileCardList>
            {cranes.map((crane) => (
              <RecordCard
                key={crane.id}
                title={
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ background: crane.colour ?? "#2563eb" }}
                    />
                    {crane.name}
                  </span>
                }
                subtitle={crane.code}
                trailing={
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      ACTIVE_STYLE[crane.is_active ? "active" : "inactive"]
                    }`}
                  >
                    {crane.is_active ? "active" : "inactive"}
                  </Badge>
                }
                fields={[
                  { label: "Site", value: siteName(crane.site_id) },
                  { label: "Radius", value: `${crane.radius_m} m` },
                  { label: "Alarm pin", value: crane.alarm_pin ?? "—" },
                  {
                    label: "Router",
                    value: crane.router_url
                      ? `${crane.router_url}${
                          crane.has_router_password ? "" : " (no password)"
                        }`
                      : "—",
                    full: true,
                  },
                ]}
                footer={
                  canManage ? (
                    <CraneRowActions
                      crane={crane}
                      onEdit={edit}
                      onDelete={setToDelete}
                    />
                  ) : undefined
                }
              />
            ))}
          </MobileCardList>

          <DataTable>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Site</TableHead>
                      <TableHead className="text-right">Radius</TableHead>
                      <TableHead>Alarm pin</TableHead>
                      <TableHead>Router</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cranes.map((crane) => (
                      <TableRow key={crane.id}>
                        <TableCell className="pl-6">
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block h-3 w-3 shrink-0 rounded-full"
                              style={{ background: crane.colour ?? "#2563eb" }}
                            />
                            {crane.name}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {crane.code}
                        </TableCell>
                        <TableCell>{siteName(crane.site_id)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {crane.radius_m} m
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {crane.alarm_pin ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[220px] truncate text-sm">
                          {crane.router_url ? (
                            <span>
                              {crane.router_url}
                              {/* Whether a password is stored is the only thing
                                  the API tells us — the value never comes back. */}
                              {!crane.has_router_password && (
                                <span className="ml-1 text-amber-600">
                                  (no password)
                                </span>
                              )}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              ACTIVE_STYLE[
                                crane.is_active ? "active" : "inactive"
                              ]
                            }`}
                          >
                            {crane.is_active ? "active" : "inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          {canManage ? (
                            <CraneRowActions
                              crane={crane}
                              onEdit={edit}
                              onDelete={setToDelete}
                            />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </DataTable>
        </>
      )}

      <CraneDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        crane={editing}
        sites={sites}
        onSuccess={refetch}
      />

      <DeleteConfirmationModal
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={deleting}
        title={`Delete crane '${toDelete?.code}'?`}
        message="The edge box stops polling it and stops driving its alarm output. Recorded positions and past alerts are kept."
      />
    </div>
  );
}

function ThresholdsTab({
  canView,
  canManage,
  sites,
}: {
  canView: boolean;
  canManage: boolean;
  sites: Site[];
}) {
  const [siteId, setSiteId] = useState<string>(ORG_WIDE);
  const [form, setForm] = useState<CraneThresholdsForm>(
    CRANE_THRESHOLDS_FORM_DEFAULTS,
  );
  const [saving, setSaving] = useState(false);
  /**
   * False while the served values are inherited rather than stored — either
   * the org has no row at all, or this site falls back to the org-wide one.
   * Saving is what creates the row, so this is a hint, not a warning.
   */
  const [configured, setConfigured] = useState(true);

  const settingsParams = useMemo(
    () => (siteId === ORG_WIDE ? {} : { site_id: siteId }),
    [siteId],
  );
  const {
    data: settings,
    loading,
    error,
    refetch,
  } = useCraneSettings(settingsParams, { enabled: canView });

  useEffect(() => {
    // Only a successful read touches the form. A failed one leaves whatever is
    // on screen alone: resetting to defaults on an error would show values
    // that are not the site's, one Save away from overwriting the real row.
    if (!settings) return;
    setForm(craneThresholdsFormFromSettings(settings));
    setConfigured(settings.is_configured);
  }, [settings]);

  function setField<K extends keyof CraneThresholdsForm>(
    key: K,
    value: CraneThresholdsForm[K],
  ) {
    // New object rather than a mutation, so the state change is visible.
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const body = buildCraneThresholds(form);
    if (!body) return;
    try {
      setSaving(true);
      const saved = await cranesApi.updateSettings(body, settingsParams);
      setForm(craneThresholdsFormFromSettings(saved));
      setConfigured(true);
      toast.success("Thresholds saved");
    } catch (err) {
      toast.error((err as ApiError).message || "Failed to save thresholds");
    } finally {
      setSaving(false);
    }
  }

  const disabled = !canManage || saving || loading;

  return (
    <form onSubmit={save} className="space-y-4">
      {error && <ErrorAlert message={error} onRetry={() => refetch()} />}

      {!error && !configured && (
        <div className="text-muted-foreground rounded-lg border border-dashed px-4 py-2 text-xs">
          {siteId === ORG_WIDE
            ? "No org-wide thresholds saved yet — these are the module defaults. Saving stores them for the organisation."
            : "This site has no thresholds of its own and is inheriting the org-wide defaults. Saving creates a row for this site."}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label>Site</Label>
          <Select value={siteId} onValueChange={setSiteId} disabled={saving}>
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ORG_WIDE}>Org-wide defaults</SelectItem>
              {sites.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            A site without its own row falls back to the org-wide defaults.
          </p>
        </div>
        {canManage && (
          <Button type="submit" disabled={disabled}>
            {saving ? "Saving…" : "Save thresholds"}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="th-warning">Warning distance (m)</Label>
            <Input
              id="th-warning"
              type="number"
              min="0"
              max={CRANE_THRESHOLD_BOUNDS.warning_m.max}
              step="0.5"
              value={form.warning_m}
              onChange={(e) => setField("warning_m", e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="th-critical">Critical distance (m)</Label>
            <Input
              id="th-critical"
              type="number"
              min="0"
              max={CRANE_THRESHOLD_BOUNDS.critical_m.max}
              step="0.5"
              value={form.critical_m}
              onChange={(e) => setField("critical_m", e.target.value)}
              disabled={disabled}
            />
            <p className="text-muted-foreground text-xs">
              Must be at or inside the warning distance.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="th-hysteresis">Hysteresis (m)</Label>
            <Input
              id="th-hysteresis"
              type="number"
              min="0"
              max={CRANE_THRESHOLD_BOUNDS.hysteresis_m.max}
              step="0.5"
              value={form.hysteresis_m}
              onChange={(e) => setField("hysteresis_m", e.target.value)}
              disabled={disabled}
            />
            <p className="text-muted-foreground text-xs">
              Extra clearance needed before an alert closes, so it cannot flap.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="th-stale">Stale after (s)</Label>
            <Input
              id="th-stale"
              type="number"
              min={CRANE_THRESHOLD_BOUNDS.stale_after_s.min}
              max={CRANE_THRESHOLD_BOUNDS.stale_after_s.max}
              step="1"
              value={form.stale_after_s}
              onChange={(e) => setField("stale_after_s", e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="th-accuracy">Max accuracy (m)</Label>
            <Input
              id="th-accuracy"
              type="number"
              min="0"
              max={CRANE_THRESHOLD_BOUNDS.max_accuracy_m.max}
              step="0.1"
              placeholder="any"
              value={form.max_accuracy_m}
              onChange={(e) => setField("max_accuracy_m", e.target.value)}
              disabled={disabled}
            />
            <p className="text-muted-foreground text-xs">
              Ignore fixes less accurate than this. Blank accepts any fix.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="th-cooldown">Reminder cooldown (s)</Label>
            <Input
              id="th-cooldown"
              type="number"
              min="0"
              max={CRANE_THRESHOLD_BOUNDS.reminder_cooldown_s.max}
              step="1"
              value={form.reminder_cooldown_s}
              onChange={(e) => setField("reminder_cooldown_s", e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="th-poll">Poll interval (s)</Label>
            <Input
              id="th-poll"
              type="number"
              min={CRANE_THRESHOLD_BOUNDS.poll_interval_s.min}
              max={CRANE_THRESHOLD_BOUNDS.poll_interval_s.max}
              step="1"
              value={form.poll_interval_s}
              onChange={(e) => setField("poll_interval_s", e.target.value)}
              disabled={disabled}
            />
            <p className="text-muted-foreground text-xs">
              How often the edge box polls each crane&apos;s router.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch
              id="th-radius"
              checked={form.use_crane_radius}
              onCheckedChange={(v) => setField("use_crane_radius", v)}
              disabled={disabled}
            />
            <Label htmlFor="th-radius" className="text-sm">
              Use crane radius — subtract each crane&apos;s radius from the
              centre-to-centre distance
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="th-fix"
              checked={form.require_fix}
              onCheckedChange={(v) => setField("require_fix", v)}
              disabled={disabled}
            />
            <Label htmlFor="th-fix" className="text-sm">
              Require a GPS fix — ignore positions reported without one
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="th-relay"
              checked={form.notify_relay}
              onCheckedChange={(v) => setField("notify_relay", v)}
              disabled={disabled}
            />
            <Label htmlFor="th-relay" className="text-sm">
              Drive the router relay outputs — the on-site siren
            </Label>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

export default function CraneSettingsPage() {
  const { permissions } = useAuth();
  const canView = permissions.has(Permission.craneView);
  const canManage = permissions.has(Permission.craneManage);

  const [sites, setSites] = useState<Site[]>([]);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;
    sitesApi
      .getMySites()
      .then((siteList) => {
        if (!cancelled) setSites(siteList);
      })
      .catch(() => {
        if (!cancelled) setSites([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canView]);

  if (!canView) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <ConeIcon className="text-muted-foreground h-8 w-8" />
            <p className="text-sm">
              You don&apos;t have access to crane settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cranes</h1>
        <p className="text-muted-foreground text-sm">
          Cranes the edge box polls, and the proximity thresholds it evaluates
          them against.
        </p>
      </div>

      <Tabs defaultValue="cranes">
        <TabsList>
          <TabsTrigger value="cranes">Cranes</TabsTrigger>
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
        </TabsList>
        <TabsContent value="cranes">
          <CranesTab canView={canView} canManage={canManage} sites={sites} />
        </TabsContent>
        <TabsContent value="thresholds">
          <ThresholdsTab
            canView={canView}
            canManage={canManage}
            sites={sites}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
