import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pluginKey(workspaceId: string, pluginId: string) {
  return `${workspaceId}::${pluginId}`;
}

export function titleFromPrompt(prompt: string) {
  const normalized = prompt.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "New conversation";
  }
  return normalized.length > 56 ? `${normalized.slice(0, 56)}...` : normalized;
}
