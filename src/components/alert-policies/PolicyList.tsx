"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  usePolicies,
  type AlertPolicy,
  type AlertTriggerType,
  type PolicyFilters as ApiPolicyFilters,
} from "@/api/alert-policies";
import { useMySites } from "@/api/sites/hooks";
import { PolicyFilters, type PolicyFilterState } from "./PolicyFilters";
import { PolicyRow } from "./PolicyRow";
import { EmptyState } from "./EmptyState";
import { PolicyDialog } from "./PolicyDialog";

export interface PolicyListProps {
  canManage: boolean;
  availableTriggers: AlertTriggerType[];
}

const DEFAULT_FILTER: PolicyFilterState = {
  site: "all",
  trigger: "all",
  active: "all",
};

export function PolicyList({ canManage, availableTriggers }: PolicyListProps) {
  const [filter, setFilter] = useState<PolicyFilterState>(DEFAULT_FILTER);
  const { sites } = useMySites();

  const apiFilters = useMemo<ApiPolicyFilters>(() => {
    const next: ApiPolicyFilters = {};
    if (filter.site !== "all" && filter.site !== "org") {
      next.site_id = filter.site;
    }
    if (filter.trigger !== "all") {
      next.trigger_type = filter.trigger as AlertTriggerType;
    }
    if (filter.active !== "all") {
      next.is_active = filter.active === "active";
    }
    return next;
  }, [filter]);

  const { policies, loading, error, refetch, updatePolicy, deletePolicy } =
    usePolicies(apiFilters);

  const visiblePolicies = useMemo(() => {
    if (filter.site === "org") {
      return policies.filter((p) => p.site_id === null);
    }
    return policies;
  }, [policies, filter.site]);

  const siteNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const site of sites) {
      map[site.id] = site.name;
    }
    return map;
  }, [sites]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<AlertPolicy | null>(null);
  const [deletingPolicy, setDeletingPolicy] = useState<AlertPolicy | null>(
    null,
  );

  function openCreate() {
    setEditingPolicy(null);
    setDialogOpen(true);
  }

  function openEdit(policy: AlertPolicy) {
    setEditingPolicy(policy);
    setDialogOpen(true);
  }

  async function handleToggleActive(policy: AlertPolicy, next: boolean) {
    try {
      await updatePolicy(policy.id, { is_active: next });
      toast.success("Policy updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update policy",
      );
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingPolicy) return;
    try {
      await deletePolicy(deletingPolicy.id);
      toast.success("Policy deleted");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete policy",
      );
    } finally {
      setDeletingPolicy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <PolicyFilters
          sites={sites}
          availableTriggers={availableTriggers}
          value={filter}
          onChange={setFilter}
        />
        {canManage && (
          <Button size="sm" className="h-8" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New alert
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-6">
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-8" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-9 rounded-full" />
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-destructive py-6 text-center text-sm"
                    >
                      {error}
                    </TableCell>
                  </TableRow>
                ) : visiblePolicies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <EmptyState canManage={canManage} onCreate={openCreate} />
                    </TableCell>
                  </TableRow>
                ) : (
                  visiblePolicies.map((policy) => (
                    <PolicyRow
                      key={policy.id}
                      policy={policy}
                      siteName={
                        policy.site_id
                          ? (siteNameById[policy.site_id] ?? null)
                          : null
                      }
                      canManage={canManage}
                      onEdit={openEdit}
                      onDelete={setDeletingPolicy}
                      onToggleActive={handleToggleActive}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <PolicyDialog
        open={dialogOpen}
        policy={editingPolicy}
        sites={sites}
        availableTriggers={availableTriggers}
        onClose={() => setDialogOpen(false)}
        onSaved={refetch}
      />

      <AlertDialog
        open={!!deletingPolicy}
        onOpenChange={(open) => !open && setDeletingPolicy(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this alert?</AlertDialogTitle>
            <AlertDialogDescription>
              Recipients on it will stop being notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
