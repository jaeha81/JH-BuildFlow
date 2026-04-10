"use client";
import React from "react";

// Badge
type BadgeVariant = "default" | "success" | "warning" | "error" | "info";
const BADGE: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};
export function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: BadgeVariant }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${BADGE[variant]}`}>{children}</span>;
}

// Button
type BtnVariant = "primary" | "secondary" | "danger" | "ghost";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary: "bg-gray-100 hover:bg-gray-200 text-gray-700",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  ghost: "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
};
export function Button({ children, variant = "primary", onClick, type = "button", disabled, className = "" }: {
  children: React.ReactNode; variant?: BtnVariant; onClick?: () => void;
  type?: "button" | "submit" | "reset"; disabled?: boolean; className?: string;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${BTN[variant]} ${className}`}>
      {children}
    </button>
  );
}

// Input
export function Input({ label, required, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; required?: boolean; error?: string }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm text-gray-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <input {...props} required={required}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? "border-red-400" : "border-gray-300"} ${props.className ?? ""}`} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Select
export function Select({ label, required, error, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; required?: boolean; error?: string }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm text-gray-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <select {...props} required={required}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? "border-red-400" : "border-gray-300"}`}>
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Textarea
export function Textarea({ label, required, error, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; required?: boolean; error?: string }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-sm text-gray-700">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
      <textarea {...props} required={required} rows={props.rows ?? 3}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${error ? "border-red-400" : "border-gray-300"}`} />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// Loading
export function LoadingSpinner({ text = "로딩 중..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}

// Empty
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <p className="text-gray-500 font-medium">{title}</p>
      {description && <p className="text-xs text-gray-400 max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

// Error
export function ErrorAlert({ message }: { message: string }) {
  return <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{message}</div>;
}
