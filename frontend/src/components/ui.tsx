import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "default" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink/90",
  default: "bg-surface text-ink border border-line hover:bg-sunken",
  ghost: "text-ink-2 hover:text-ink hover:bg-sunken",
  danger: "text-bad hover:bg-bad-soft",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[13px]",
  md: "h-9 px-3.5 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "default",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-ctrl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface border border-line rounded-card ${className}`}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad" | "accent";
}) {
  const tones = {
    neutral: "bg-sunken text-ink-2",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    bad: "bg-bad-soft text-bad",
    accent: "bg-accent-soft text-accent",
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-ctrl text-[11px] font-medium leading-tight ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-12 px-4">
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      <p className="text-[13px] text-ink-2 mt-1 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-[13px] text-ink-2">{label}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="text-center py-12 px-4">
      <h3 className="text-sm font-medium text-bad">Something went wrong</h3>
      <p className="text-[13px] text-ink-2 mt-1 max-w-sm mx-auto leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <Button variant="default" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-end justify-between mb-6">
      <div>
        <h1 className="text-lg font-semibold text-ink tracking-tight">{title}</h1>
        {description && (
          <p className="text-[13px] text-ink-2 mt-0.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  );
}
