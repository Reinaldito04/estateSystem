import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  backHref,
  backLabel = "Volver",
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        {backHref && (
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2 text-muted-foreground">
            <Link href={backHref}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        )}
        {eyebrow && (
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
        )}
        <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </header>
  );
}

interface DetailSectionProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DetailSection({ title, eyebrow, description, actions, children, className }: DetailSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
          )}
          <h2 className="mt-1 text-lg font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
