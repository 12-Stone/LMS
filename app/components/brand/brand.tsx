import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

export function LogoLockup({ className }: { className?: string }) {
  return (
    <img
      src={BRAND.logos.lockupOnDark}
      alt={BRAND.parent}
      className={cn("h-auto object-contain mix-blend-lighten", className)}
    />
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={BRAND.logos.markOnDark}
      alt={BRAND.parent}
      className={cn("aspect-square object-contain mix-blend-lighten", className)}
    />
  );
}

export function PageHeader({
  eyebrow,
  title,
  emphasis,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  emphasis?: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-6 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
      <div className="max-w-[680px]">
        {eyebrow && (
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-tsd-slate dark:text-tsd-gold">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-tight md:text-5xl">
          {title}
          {emphasis && (
            <>
              {" "}
              <em className="text-tsd-slate dark:text-tsd-gold">{emphasis}</em>
            </>
          )}
        </h1>
        {description && (
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-4">
      <h2 className="font-display text-2xl font-medium">{children}</h2>
      {action}
    </div>
  );
}

export function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="border-l-2 border-tsd-gold/70 pl-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-[2px] bg-secondary", className)}>
      <div
        className={cn("h-full", value >= 100 ? "bg-tsd-sage" : "bg-tsd-slate dark:bg-tsd-gold")}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-tsd-sage/15 text-[#3d5a40] dark:text-tsd-sage border-tsd-sage/40",
  in_progress: "bg-tsd-slate/10 text-tsd-slate dark:text-tsd-limestone border-tsd-slate/30",
  not_started: "bg-transparent text-muted-foreground border-border",
  overdue: "bg-destructive/10 text-destructive border-destructive/30",
  draft: "bg-transparent text-muted-foreground border-dashed border-border",
  published: "bg-tsd-sage/15 text-[#3d5a40] dark:text-tsd-sage border-tsd-sage/40",
  in_review: "bg-tsd-gold/15 text-[#6b5520] dark:text-tsd-gold border-tsd-gold/40",
  approved: "bg-tsd-sage/15 text-[#3d5a40] dark:text-tsd-sage border-tsd-sage/40",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  in_progress: "In progress",
  not_started: "Not started",
  overdue: "Overdue",
  draft: "Draft",
  published: "Published",
  in_review: "In review",
  approved: "Approved",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] border px-2 py-0.5 text-[11px] font-medium",
        STATUS_STYLES[status] ?? STATUS_STYLES.not_started,
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function CourseThumb({
  title,
  category,
  className,
}: {
  title: string;
  category: string;
  className?: string;
}) {
  const initial = title.trim().charAt(0).toUpperCase();
  return (
    <div
      className={cn(
        "tsd-pattern relative flex aspect-[16/9] items-end overflow-hidden bg-tsd-charcoal p-4 text-tsd-limestone",
        className,
      )}
    >
      <span className="absolute right-4 top-1 font-display text-7xl leading-none text-tsd-gold/80">
        {initial}
      </span>
      <div className="absolute left-4 top-4 h-px w-8 bg-tsd-gold" />
      <span className="relative text-[11px] font-medium uppercase tracking-[0.18em] text-tsd-limestone/80">
        {category}
      </span>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-border px-6 py-12 text-center">
      <p className="font-display text-xl">{title}</p>
      {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[1280px] px-5 py-8 md:px-10 md:py-12">{children}</div>;
}
