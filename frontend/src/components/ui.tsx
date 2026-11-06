"use client";

import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  useEffect,
} from "react";
import { X } from "lucide-react";

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

const FIELD_CLASS =
  "h-9 w-full px-3 rounded-ctrl border border-line bg-surface text-[13px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent";

export function Input({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-ink-2 mb-1">
        {label}
      </span>
      <input className={FIELD_CLASS} {...props} />
    </label>
  );
}

export function Select({
  label,
  options,
  ...props
}: { label: string; options: { value: string; label: string }[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-ink-2 mb-1">
        {label}
      </span>
      <select className={`${FIELD_CLASS} px-2`} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function InlineAlert({
  tone = "bad",
  children,
}: {
  tone?: "bad" | "warn" | "ok" | "accent";
  children: ReactNode;
}) {
  const tones = {
    bad: "bg-bad-soft text-bad",
    warn: "bg-warn-soft text-warn",
    ok: "bg-ok-soft text-ok",
    accent: "bg-accent-soft text-accent",
  };
  return (
    <div className={`px-3 py-2 rounded-ctrl text-[13px] leading-relaxed ${tones[tone]}`}>
      {children}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-label={title}
        className="relative bg-surface border border-line rounded-card w-full max-w-md shadow-lg"
      >
        <div className="h-12 px-4 flex items-center border-b border-line">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <button
            onClick={onClose}
            className="ml-auto p-1 text-ink-3 hover:text-ink rounded-ctrl hover:bg-sunken transition-colors"
            aria-label="Close"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
        <div className="p-4">{children}</div>
        {footer && (
          <div className="px-4 py-3 border-t border-line flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="default" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[13px] text-ink-2 leading-relaxed">{message}</p>
    </Modal>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-sunken border border-line"
      }`}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
