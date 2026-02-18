"use client";

import type { PluginInputField } from "@/schemas/domain/input";
import { cn } from "@/lib/utils";

interface InputRendererProps {
  field: PluginInputField;
  value: unknown;
  error?: string;
  onChange: (name: string, value: unknown) => void;
}

function FieldShell({
  field,
  error,
  children
}: {
  field: PluginInputField;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {field.label}
        {field.required ? <span className="text-red-500 ml-1">*</span> : null}
      </label>
      {field.description ? <p className="text-xs text-muted-foreground">{field.description}</p> : null}
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

export function InputRenderer({ field, value, error, onChange }: InputRendererProps) {
  if (field.type === "text") {
    return (
      <FieldShell field={field} error={error}>
        <input
          className={cn(
            "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none",
            "focus:ring-2 focus:ring-compass-blue/40",
            error ? "border-red-500" : "border-border"
          )}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
      </FieldShell>
    );
  }

  if (field.type === "textarea") {
    return (
      <FieldShell field={field} error={error}>
        <textarea
          className={cn(
            "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none resize-y",
            "focus:ring-2 focus:ring-compass-blue/40",
            error ? "border-red-500" : "border-border"
          )}
          rows={field.rows ?? 3}
          value={typeof value === "string" ? value : ""}
          placeholder={field.placeholder}
          onChange={(event) => onChange(field.name, event.target.value)}
        />
      </FieldShell>
    );
  }

  if (field.type === "toggle") {
    const checked = typeof value === "boolean" ? value : false;
    return (
      <FieldShell field={field} error={error}>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onChange(field.name, event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          <span>{checked ? "Enabled" : "Disabled"}</span>
        </label>
      </FieldShell>
    );
  }

  if (field.type === "select") {
    return (
      <FieldShell field={field} error={error}>
        <select
          className={cn(
            "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none",
            "focus:ring-2 focus:ring-compass-blue/40",
            error ? "border-red-500" : "border-border"
          )}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(field.name, event.target.value)}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  }

  if (field.type === "multiselect") {
    const selectedValues = Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
    return (
      <FieldShell field={field} error={error}>
        <div className="space-y-2 rounded-md border border-border bg-background p-2">
          {field.options.map((option) => {
            const checked = selectedValues.includes(option.value);
            return (
              <label key={option.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => {
                    if (event.target.checked) {
                      onChange(field.name, [...selectedValues, option.value]);
                      return;
                    }
                    onChange(
                      field.name,
                      selectedValues.filter((entry) => entry !== option.value)
                    );
                  }}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </FieldShell>
    );
  }

  return null;
}
