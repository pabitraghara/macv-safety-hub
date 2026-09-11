"use client";

import { Button } from "@/components/ui/button";

interface TablePaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

function getPageNumbers(currentPage: number, totalPages: number) {
  const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];

  if (totalPages > 0) pages.push(1);
  if (currentPage > 3) pages.push("ellipsis-start");

  for (
    let i = Math.max(2, currentPage - 1);
    i <= Math.min(totalPages - 1, currentPage + 1);
    i++
  ) {
    if (!pages.includes(i)) pages.push(i);
  }

  if (currentPage < totalPages - 2) pages.push("ellipsis-end");
  if (totalPages > 1 && !pages.includes(totalPages)) pages.push(totalPages);

  return pages;
}

/**
 * Shared pagination footer for tables. Renders "x – y of z results" with
 * outline page buttons, matching the safety-hub pagination style.
 */
export function TablePagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: TablePaginationProps) {
  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);
  const rangeStart = Math.min((page - 1) * pageSize + 1, totalCount);
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
      <div className="text-muted-foreground text-sm">
        <span className="text-foreground font-medium">{rangeStart}</span>
        <span> – </span>
        <span className="text-foreground font-medium">{rangeEnd}</span>
        <span> of </span>
        <span className="text-foreground font-medium">{totalCount}</span>
        <span> results</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </Button>

        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((p, index) =>
            p === "ellipsis-start" || p === "ellipsis-end" ? (
              <span
                key={`${p}-${index}`}
                className="text-muted-foreground px-2"
              >
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === page ? "default" : "outline"}
                size="sm"
                className="h-8 min-w-[32px]"
                onClick={() => onPageChange(p)}
              >
                {p}
              </Button>
            ),
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default TablePagination;
