import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "./DataTable";
import { FilterBar } from "./FilterBar";
import { SAMPLE_OFFICER_DIRECTORY } from "@/lib/cpgrams/sample-data";

type OfficerRow = (typeof SAMPLE_OFFICER_DIRECTORY)[number];

const columns: DataTableColumn<OfficerRow>[] = [
  {
    id: "name",
    header: "Officer",
    cell: (r) => (
      <div>
        <p className="font-medium">{r.name}</p>
        <p className="text-xs text-muted-foreground">{r.designation}</p>
      </div>
    ),
  },
  { id: "org", header: "Organisation", cell: (r) => r.organisation, hideBelow: "sm" },
  {
    id: "contact",
    header: "Contact",
    cell: (r) => (
      <div className="text-xs">
        <p>{r.email}</p>
        <p className="text-muted-foreground">{r.phone}</p>
      </div>
    ),
    hideBelow: "md",
  },
];

export function OfficerDirectory({ caption }: { caption?: string }) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SAMPLE_OFFICER_DIRECTORY;
    return SAMPLE_OFFICER_DIRECTORY.filter((r) =>
      [r.name, r.designation, r.organisation].join(" ").toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="space-y-4">
      <FilterBar
        searchPlaceholder="Search by officer, designation or organisation"
        searchValue={query}
        onSearchChange={setQuery}
        onReset={() => setQuery("")}
      />
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.id}
        caption={
          caption ??
          "Prototype/demo directory records only. They are not official government directory data."
        }
        emptyTitle="No officers matched"
        emptyDescription="Try a different ministry, department or officer name."
      />
    </div>
  );
}
