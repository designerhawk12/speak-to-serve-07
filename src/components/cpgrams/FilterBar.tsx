import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDefinition {
  id: string;
  label: string;
  options: FilterOption[];
  value?: string;
}

export interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: FilterDefinition[];
  onFilterChange?: (id: string, value: string) => void;
  onReset?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function FilterBar({
  searchPlaceholder = "Search",
  searchValue = "",
  onSearchChange,
  filters = [],
  onFilterChange,
  onReset,
  className,
  children,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-3 md:flex-row md:items-center",
        className,
      )}
      role="search"
    >
      <div className="relative flex-1 md:max-w-xs">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="pl-9"
          aria-label={searchPlaceholder}
        />
      </div>

      <div className="flex flex-wrap gap-2 md:flex-nowrap">
        {filters.map((f) => (
          <Select key={f.id} value={f.value} onValueChange={(v) => onFilterChange?.(f.id, v)}>
            <SelectTrigger className="min-w-[9rem]" aria-label={f.label}>
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        {children}
        {onReset && (
          <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">
            <X className="size-4" aria-hidden />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
