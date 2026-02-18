"use client";

import Link from "next/link";
import { Loader2, PencilLine } from "lucide-react";
import type { WorkspaceAdminGroupModel } from "@/schemas/domain/plugin";

interface PluginsDashboardProps {
  groups: WorkspaceAdminGroupModel[];
  loading: boolean;
  error: string | null;
}

export function PluginsDashboard({ groups, loading, error }: PluginsDashboardProps) {
  if (loading) {
    return (
      <div className="panel p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" />
        Loading plugin configuration...
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel p-4 text-sm text-red-600 bg-red-500/10 border-red-500/20">
        {error}
      </div>
    );
  }

  if (!groups.length) {
    return <div className="panel p-4 text-sm text-muted-foreground">No plugins available.</div>;
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.workspaceId} className="panel overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60">
            <h2 className="font-semibold">{group.workspaceName}</h2>
            <p className="text-xs text-muted-foreground">{group.workspaceDescription || "No description"}</p>
          </div>
          <div className="divide-y divide-border/50">
            {group.plugins.map((plugin) => (
              <div
                key={`${plugin.workspaceId}-${plugin.pluginId}`}
                className="px-4 py-3 grid grid-cols-[minmax(0,1fr)_9rem_8rem_7rem] gap-3 items-center text-sm"
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{plugin.pluginName}</div>
                  <div className="text-xs text-muted-foreground truncate">{plugin.description || "No description"}</div>
                </div>

                <div className="text-xs text-muted-foreground">
                  <div>{plugin.pluginType ?? "unknown"}</div>
                  <div>{plugin.serviceKey ?? "no-service-key"}</div>
                </div>

                <div className="text-xs">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 ${
                      plugin.enabled
                        ? "bg-green-500/10 text-green-700 dark:text-green-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {plugin.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <div className="justify-self-end">
                  <Link
                    href={`/plugins/${plugin.workspaceId}/${plugin.pluginId}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted/40"
                  >
                    <PencilLine size={12} />
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
