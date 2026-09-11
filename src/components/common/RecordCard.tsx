"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Mobile-only list wrapper. Pairs with `<DataTable>`, which is `hidden md:block`
 * — without a list like this a table renders as nothing below the `md`
 * breakpoint (only the surrounding page chrome and pagination stay visible).
 */
export function MobileCardList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("block space-y-3 md:hidden", className)}>{children}</div>
  );
}

export interface RecordCardField {
  label: string;
  value: React.ReactNode;
  /** Span both columns and wrap instead of truncating — for long values. */
  full?: boolean;
}

interface RecordCardProps {
  /** Primary identifier for the row (name, plate, timestamp). */
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Leading visual — thumbnail, avatar, icon. */
  media?: React.ReactNode;
  /** Right-aligned badge or action menu. Clicks here never reach `onClick`. */
  trailing?: React.ReactNode;
  fields?: RecordCardField[];
  /** Rendered full-width below the fields — expanded content, wide images. */
  footer?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

/**
 * One table row rendered as a card, for the mobile breakpoint. Keeping the
 * shape declarative (title / media / fields) keeps the ~9 tables that need a
 * mobile fallback visually consistent without duplicating layout JSX.
 */
export function RecordCard({
  title,
  subtitle,
  media,
  trailing,
  fields = [],
  footer,
  onClick,
  className,
}: RecordCardProps) {
  return (
    <Card
      className={cn("gap-0 py-0", onClick && "cursor-pointer", className)}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {media && <div className="shrink-0">{media}</div>}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium break-words">{title}</div>
            {subtitle && (
              <div className="text-muted-foreground mt-0.5 text-xs break-words">
                {subtitle}
              </div>
            )}
          </div>
          {trailing && (
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              {trailing}
            </div>
          )}
        </div>

        {fields.length > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {fields.map((field) => (
              <div
                key={field.label}
                className={cn("min-w-0", field.full && "col-span-2")}
              >
                <dt className="text-muted-foreground text-xs">{field.label}</dt>
                <dd
                  className={cn(
                    "mt-0.5 text-sm",
                    field.full ? "break-words" : "truncate",
                  )}
                >
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {footer && <div className="mt-3">{footer}</div>}
      </CardContent>
    </Card>
  );
}
