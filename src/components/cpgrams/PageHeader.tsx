import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3 pb-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-xs font-bold tracking-wide text-primary uppercase">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
