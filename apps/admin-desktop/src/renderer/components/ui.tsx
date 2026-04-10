import React from "react";

/* ────────────────────────────────────────────────────────────────
 * JH BuildFlow — Admin Desktop UI Kit (Dark Neo-Brutalism)
 *
 * 원칙 (다크 버전):
 *  ① 2px solid #fff 또는 컬러 테두리
 *  ② 4px 4px 0 rgba(255,255,255,0.25) 하드 그림자
 *  ③ hover = translate(+2,+2) + 그림자 축소
 *  ④ 배경 #0F1117 (deep dark), 카드 #1A1D27
 *  ⑤ 강조 원색 그대로 유지 (블루, 옐로, 레드)
 * ──────────────────────────────────────────────────────────────── */

// ─── Badge ─────────────────────────────────────────────────────
type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "idle";
const BADGE: Record<BadgeVariant, string> = {
  default: "bg-[#1A1D27] text-gray-300 border-gray-500",
  success: "bg-[#4ADE80] text-black border-black",
  warning: "bg-[#FFE566] text-black border-black",
  error:   "bg-[#FF6B6B] text-white border-black",
  info:    "bg-[#5B8DEF] text-white border-black",
  idle:    "bg-[#1A1D27] text-gray-500 border-gray-700",
};

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-bold border-2 ${BADGE[variant]}`}
    >
      {children}
    </span>
  );
}

// ─── StatusCard ────────────────────────────────────────────────
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
    <div
      className={`
        border-2 p-5 space-y-1
        shadow-[4px_4px_0px_rgba(255,255,255,0.15)]
        ${accent
          ? "bg-[#5B8DEF] border-white"
          : "bg-[#1A1D27] border-gray-600"}
      `}
    >
      <p className={`text-xs font-bold uppercase tracking-wide ${accent ? "text-blue-100" : "text-gray-500"}`}>
        {title}
      </p>
      <p className={`text-2xl font-black ${accent ? "text-white" : "text-white"}`}>{value}</p>
      {sub && <p className={`text-xs ${accent ? "text-blue-200" : "text-gray-600"}`}>{sub}</p>}
    </div>
  );
}

// ─── PageHeader ────────────────────────────────────────────────
export function PageHeader({
  title,
  actions,
}: {
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-5 border-b-2 border-white/10">
      <h1 className="text-lg font-black text-white tracking-tight">{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Button ────────────────────────────────────────────────────
type BtnVariant = "primary" | "secondary" | "danger" | "ghost";
const BTN: Record<BtnVariant, string> = {
  primary:   "bg-[#5B8DEF] text-white border-white/60 hover:bg-[#4a7de0]",
  secondary: "bg-[#FFE566] text-black border-black hover:bg-[#f5d84f]",
  danger:    "bg-[#FF6B6B] text-white border-white/60 hover:bg-[#f05555]",
  ghost:     "bg-transparent text-gray-400 border-gray-600 hover:text-white hover:border-white",
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
      className={`
        px-4 py-2 text-sm font-bold border-2 transition-all
        shadow-[4px_4px_0px_rgba(255,255,255,0.2)]
        hover:shadow-[2px_2px_0px_rgba(255,255,255,0.2)] hover:translate-x-[2px] hover:translate-y-[2px]
        active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
        disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none
        ${BTN[variant]} ${className}
      `}
    >
      {children}
    </button>
  );
}

// ─── Input ─────────────────────────────────────────────────────
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
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
          {label}
          {required && <span className="text-[#FF6B6B] ml-0.5">*</span>}
        </label>
      )}
      <input
        {...props}
        required={required}
        className={`
          w-full bg-[#0F1117] border-2 px-3 py-2 text-sm font-medium text-white
          placeholder-gray-600 focus:outline-none
          focus:border-[#5B8DEF] focus:shadow-[4px_4px_0px_#5B8DEF]
          ${error ? "border-[#FF6B6B]" : "border-gray-600"}
          ${props.className ?? ""}
        `}
      />
      {error && <p className="text-xs font-bold text-[#FF6B6B]">{error}</p>}
    </div>
  );
}

// ─── Select ────────────────────────────────────────────────────
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
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
          {label}
          {required && <span className="text-[#FF6B6B] ml-0.5">*</span>}
        </label>
      )}
      <select
        {...props}
        required={required}
        className={`
          w-full bg-[#0F1117] border-2 px-3 py-2 text-sm font-medium text-white
          focus:outline-none focus:border-[#5B8DEF]
          ${error ? "border-[#FF6B6B]" : "border-gray-600"}
        `}
      >
        {children}
      </select>
      {error && <p className="text-xs font-bold text-[#FF6B6B]">{error}</p>}
    </div>
  );
}

// ─── Textarea ──────────────────────────────────────────────────
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
        <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide">
          {label}
          {required && <span className="text-[#FF6B6B] ml-0.5">*</span>}
        </label>
      )}
      <textarea
        {...props}
        required={required}
        rows={props.rows ?? 3}
        className={`
          w-full bg-[#0F1117] border-2 px-3 py-2 text-sm font-medium text-white
          placeholder-gray-600 focus:outline-none resize-none
          focus:border-[#5B8DEF]
          ${error ? "border-[#FF6B6B]" : "border-gray-600"}
        `}
      />
      {error && <p className="text-xs font-bold text-[#FF6B6B]">{error}</p>}
    </div>
  );
}

// ─── LoadingSpinner ─────────────────────────────────────────────
export function LoadingSpinner({ text = "로딩 중..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="w-10 h-10 border-4 border-white bg-[#5B8DEF] animate-spin shadow-[3px_3px_0px_rgba(255,255,255,0.3)]" />
      <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">{text}</p>
    </div>
  );
}

// ─── EmptyState ────────────────────────────────────────────────
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
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="w-16 h-1 bg-white/20" />
      <p className="text-base font-black text-white">{title}</p>
      {description && (
        <p className="text-sm text-gray-500 max-w-xs">{description}</p>
      )}
      {action}
    </div>
  );
}

// ─── ErrorAlert ────────────────────────────────────────────────
export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="mx-6 mt-4 px-4 py-3 bg-[#FF6B6B] border-2 border-white/60 text-sm font-bold text-white shadow-[4px_4px_0px_rgba(255,255,255,0.2)]">
      ⚠ {message}
    </div>
  );
}
