import React from "react";

type StatusCardProps = {
  title: string;
  value: number | string;
  description?: string;
  icon?: React.ReactNode;
};

export function StatusCard({ title, value, description, icon }: StatusCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {description && <p className="text-xs text-gray-400">{description}</p>}
    </div>
  );
}
