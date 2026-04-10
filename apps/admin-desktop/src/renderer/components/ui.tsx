import React from "react";

// ── Badge ────────────────────────────────────────────────
type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "idle";
const BADGE_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-gray-700 text-gray-300",
  success: "bg-green-900 text-green-300",
  warning: "bg-yellow-900 text-yellow-300",
  error: "bg-red-900 text-red-300",
  info: "bg-blue-900 text-blue-300",
  idle: "bg-gray-800 text-gray-400",
};

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${BADGE_CLASSES[variant]}`}>
      {children}
    </span>
  );
}

// ── StatusCard ───────────────────────────────────────────
export function StatusCard({
  title,
  value,
  sub,
  accent = false,
}: {
  title: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 space-y-1 ${accent ? "border-blue-700 bg-blue-950/40" : "border-gray-800 bg-gray-900"}`}>
      <p className="text-xs text-gray-500">{title}</p>
      <p className={`text-2xl font-semibold ${accent ? "text-blue-300" : "text-white"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

// ── PageHeader ───────────────────────────────────────────
export function PageHeader({
  title,
  actions,
}: {
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-800">
      <h1 className="text-lg font-semibold text-white">{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── Button ───────────────────────────────────────────────
type BtnVariant = "primary" | "secondary" | "danger" | "ghost";
const BTN_CLASSES: Record<BtnVariant, string> = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-gray-700 hover:bg-gray-600 text-white",
  danger: "bg-red-700 hover:bg-red-600 text-white",
  ghost: "text-gray-400 hover:text-white hover:bg-gray-800",
};

export function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled = false,
  className = "",
}: {
  children: React.ReactNode;
  variant?: BtnVariant;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BTN_CLASSES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ── Input ────────────────────────────────────────────────
export function Input({
  label,
  required,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-xs text-gray-400">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <input
        {...props}
        required={required}
        className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
          error ? "border-red-600" : "border-gray-700"
        } ${props.className ?? ""}`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── Select ───────────────────────────────────────────────
export function Select({
  label,
  required,
  error,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-xs text-gray-400">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <select
        {...props}
        required={required}
        className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${
          error ? "border-red-600" : "border-gray-700"
        }`}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

// ── LoadingSpinner ───────────────────────────────────────
export function LoadingSpinner({ text = "로딩 중..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}

// ── EmptyState ───────────────────────────────────────────
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <p className="text-gray-500 font-medium">{title}</p>
      {description && <p className="text-xs text-gray-600 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

// ── ErrorAlert ───────────────────────────────────────────
export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="mx-6 mt-4 px-4 py-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-300">
      {message}
    </div>
  );
}

// ── Textarea ─────────────────────────────────────────────
export function Textarea({
  label,
  required,
  error,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="text-xs text-gray-400">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <textarea
        {...props}
        required={required}
        rows={props.rows ?? 3}
        className={`w-full bg-gray-800 border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none ${
          error ? "border-red-600" : "border-gray-700"
        }`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
