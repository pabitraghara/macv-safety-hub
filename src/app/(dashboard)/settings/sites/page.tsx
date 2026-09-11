"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMySites } from "@/api/sites";
import { AddSiteDialog } from "./components/AddSiteDialog";

export default function SitesPage() {
  const router = useRouter();
  const { sites, loading, error, refetch } = useMySites();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const activeSites = useMemo(
    () =>
      sites.filter(
        (s) =>
          s.is_active &&
          (!search ||
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.code.toLowerCase().includes(search.toLowerCase()) ||
            s.city?.toLowerCase().includes(search.toLowerCase()) ||
            s.country?.toLowerCase().includes(search.toLowerCase())),
      ),
    [sites, search],
  );

  const inactiveSites = useMemo(
    () =>
      sites.filter(
        (s) =>
          !s.is_active &&
          (!search ||
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.code.toLowerCase().includes(search.toLowerCase()) ||
            s.city?.toLowerCase().includes(search.toLowerCase()) ||
            s.country?.toLowerCase().includes(search.toLowerCase())),
      ),
    [sites, search],
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Sites</h1>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            className="h-8 pl-8 text-sm"
            placeholder="Search by name, code, or location"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="ml-auto">
          <Button size="sm" className="h-8" onClick={() => setAddOpen(true)}>
            <MapPin className="mr-1.5 h-4 w-4" />
            Add Site
          </Button>
        </div>
      </div>

      {error && <p className="text-destructive mb-4 text-sm">{error}</p>}

      {/* Table */}
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px] pl-6">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-24">Timezone</TableHead>
              <TableHead className="w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <>
                {activeSites.length > 0 && (
                  <>
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={5}
                        className="text-muted-foreground bg-muted/40 border-y px-4 py-2 pl-6 text-xs font-medium"
                      >
                        Active {activeSites.length}
                      </TableCell>
                    </TableRow>
                    {activeSites.map((site) => (
                      <TableRow
                        key={site.id}
                        className="cursor-pointer"
                        onClick={() =>
                          router.push(`/settings/sites/${site.id}`)
                        }
                      >
                        <TableCell className="pl-6 font-mono text-sm">
                          {site.code}
                        </TableCell>
                        <TableCell className="font-medium">
                          {site.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {[site.city, site.country]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {site.timezone ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="default"
                            className="text-xs font-normal"
                          >
                            Active
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {inactiveSites.length > 0 && (
                  <>
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={5}
                        className="text-muted-foreground bg-muted/40 border-y px-4 py-2 pl-6 text-xs font-medium"
                      >
                        Inactive {inactiveSites.length}
                      </TableCell>
                    </TableRow>
                    {inactiveSites.map((site) => (
                      <TableRow
                        key={site.id}
                        className="cursor-pointer opacity-60"
                        onClick={() =>
                          router.push(`/settings/sites/${site.id}`)
                        }
                      >
                        <TableCell className="pl-6 font-mono text-sm">
                          {site.code}
                        </TableCell>
                        <TableCell className="font-medium">
                          {site.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {[site.city, site.country]
                            .filter(Boolean)
                            .join(", ") || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {site.timezone ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="text-xs font-normal"
                          >
                            Inactive
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {activeSites.length === 0 && inactiveSites.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-muted-foreground py-12 text-center text-sm"
                    >
                      {search ? "No sites match your search." : "No sites yet."}
                    </TableCell>
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <AddSiteDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
