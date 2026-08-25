import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { LoadingState } from "./LoadingState";
import { EmptyState } from "./EmptyState";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Hide on small screens to keep dense officer tables usable on mobile. */
  hideBelow?: "sm" | "md" | "lg";
  align?: "left" | "right";
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  caption?: string;
  className?: string;
}

const hideClass = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
} as const;

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  onRowClick,
  isLoading,
  emptyTitle = "Nothing to show",
  emptyDescription = "There are no records matching the current filters.",
  caption,
  className,
}: DataTableProps<T>) {
  if (isLoading) return <LoadingState variant="table" />;
  if (rows.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-border bg-surface-raised", className)}>
      <Table>
        {caption && <caption className="p-3 text-left text-xs text-muted-foreground">{caption}</caption>}
        <TableHeader>
          <TableRow className="bg-surface-sunken">
            {columns.map((c) => (
              <TableHead
                key={c.id}
                className={cn(
                  "text-xs font-semibold tracking-wide uppercase",
                  c.align === "right" && "text-right",
                  c.hideBelow && hideClass[c.hideBelow],
                )}
              >
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={getRowId(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(onRowClick && "cursor-pointer")}
            >
              {columns.map((c) => (
                <TableCell
                  key={c.id}
                  className={cn("text-sm", c.align === "right" && "text-right", c.hideBelow && hideClass[c.hideBelow])}
                >
                  {c.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
