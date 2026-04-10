"use client";
import React from "react";

/* ────────────────────────────────────────────────────────────────
 * JH BuildFlow — Vendor Web UI Kit (Neo-Brutalism)
 *
 * 원칙:
 *  ① 2px solid #000 테두리
 *  ② 4px 4px 0 #000 하드 그림자 (블러 없음)
 *  ③ hover = translate(+2,+2) + 그림자 축소 → 눌리는 효과
 *  ④ 모서리 없음 (rounded-none), 색상 평면 원색
 * ──────────────────────────────────────────────────────────────── */

// ─── Badge ─────────────────────────────────────────────────────
type BadgeVariant = "default" | "success" | "warning" | "error" | "info";
const BADGE: Record<BadgeVariant, string> = {
  default: "bg-white text-black",
  success: "bg-[#4ADE80] text-black",
  warning: "bg-[#FFE566] text-black",
  error:   "bg-[#FF6B6B] text-black",
  info:    "bg-[#5B8DEF] text-white",
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
      className={`inline-flex items-center px-2 py-0.5 text-xs font-bold border-2 border-black ${BADGE[variant]}`}
    >
      {children}
    </span>
  );
}

// ─── Button ────────────────────────────────────────────────────
type BtnVariant = "primary" | "secondary" | "danger" | "ghost";
const BTN: Record<BtnVariant, string> = {
  primary:   "bg-[#5B8DEF] text-white border-black hover:bg-[#4a7de0]",
  secondary: "bg-[#FFE566] text-black border-black hover:bg-[#f5d84f]",
  danger:    "bg-[#FF6B6B] text-white border-black hover:bg-[#f05555]",
  ghost:     "bg-white text-black border-black hover:bg-gray-50",
};

export function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
  disabled,
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
        shadow-[4px_4px_0px_#000]
        hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]
        active:shadow-none active:translate-x-[4px] active:translate-y-[4px]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
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
        <label className="block text-sm font-bold text-black">
          {label}
          {required && <span className="text-[#FF6B6B] ml-0.5">*</span>}
        </label>
      )}
      <input
        {...props}
        required={required}
        className={`
          w-full bg-white border-2 px-3 py-2 text-sm font-medium text-black
          focus:outline-none focus:shadow-[4px_4px_0px_#5B8DEF]
          ${error ? "border-[#FF6B6B]" : "border-black"}
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
        <label className="block text-sm font-bold text-black">
          {label}
          {required && <span className="text-[#FF6B6B] ml-0.5">*</span>}
        </label>
      )}
      <select
        {...props}
        required={required}
        className={`
          w-full bg-white border-2 px-3 py-2 text-sm font-medium text-black
          focus:outline-none
          ${error ? "border-[#FF6B6B]" : "border-black"}
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
        <label className="block text-sm font-bold text-black">
          {label}
          {required && <span className="text-[#FF6B6B] ml-0.5">*</span>}
        </label>
      )}
      <textarea
        {...props}
        required={required}
        rows={props.rows ?? 3}
        className={`
          w-full bg-white border-2 px-3 py-2 text-sm font-medium text-black
          focus:outline-none resize-none
          ${error ? "border-[#FF6B6B]" : "border-black"}
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
      {/* 네오브루탈 스피너: 회전하는 사각형 */}
      <div className="w-10 h-10 border-4 border-black bg-[#5B8DEF] animate-spin shadow-[3px_3px_0px_#000]" />
      <p className="text-sm font-bold text-black">{text}</p>
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
      <div className="w-16 h-1 bg-black" />
      <p className="text-base font-bold text-black">{title}</p>
      {description && (
        <p className="text-sm text-gray-600 max-w-xs">{description}</p>
      )}
      {action}
    </div>
  );
}

// ─── ErrorAlert ────────────────────────────────────────────────
export function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="px-4 py-3 bg-[#FF6B6B] border-2 border-black text-sm font-bold text-white shadow-[4px_4px_0px_#000]">
      ⚠ {message}
    </div>
  );
}

// ─── Card ──────────────────────────────────────────────────────
export function Card({
  children,
  className = "",
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: string; // bg color class e.g. "bg-[#5B8DEF]"
}) {
  return (
    <div
      className={`
        border-2 border-black shadow-[4px_4px_0px_#000]
        ${accent ?? "bg-white"}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
