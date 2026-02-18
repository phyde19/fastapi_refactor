"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import type { PluginAdminRecordModel } from "@/schemas/domain/plugin";

interface PluginDetailViewProps {
  plugin: PluginAdminRecordModel | null;
  loading: boolean;
  error: string | null;
  onSave: (input: { pluginName: string; description: string; instructions: string }) => Promise<void>;
}

export function PluginDetailView({ plugin, loading, error, onSave }: PluginDetailViewProps) {
  const [pluginName, setPluginName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!plugin) {
      return;
    }
    setPluginName(plugin.pluginName);
    setDescription(plugin.description);
    setInstructions(plugin.instructions);
    setSaveError(null);
    setSaveSuccess(false);
  }, [plugin]);

  const readonlyDetails = useMemo(
    () =>
      plugin
        ? {
            pluginId: plugin.pluginId,
            workspaceId: plugin.workspaceId,
            serviceKey: plugin.serviceKey,
            serviceType: plugin.serviceType,
            pluginType: plugin.pluginType,
            createdAt: plugin.createdAt,
            updatedAt: plugin.updatedAt,
            updatedBy: plugin.updatedBy
          }
        : null,
    [plugin]
  );

  if (loading && !plugin) {
    return (
      <div className="panel p-6 text-sm text-muted-foreground flex items-center gap-2">
        <Loader2 size={14} className="animate-spin" />
        Loading plugin details...
      </div>
    );
  }

  if (error && !plugin) {
    return (
      <div className="panel p-4 text-sm text-red-600 bg-red-500/10 border-red-500/20">
        {error}
      </div>
    );
  }

  if (!plugin) {
    return <div className="panel p-4 text-sm text-muted-foreground">Plugin not found.</div>;
  }

  return (
    <div className="space-y-4">
      <Link href="/plugins" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={14} />
        Back to plugins
      </Link>

      <section className="panel p-4 space-y-4">
        <div>
          <h1 className="text-lg font-semibold">
            {plugin.workspaceName} / {plugin.pluginName}
          </h1>
          <p className="text-xs text-muted-foreground">Editable in v1: name, description, instructions.</p>
        </div>

        <div className="space-y-3">
          <label className="space-y-1 block">
            <span className="text-sm font-medium">Plugin Name</span>
            <input
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={pluginName}
              onChange={(event) => setPluginName(event.target.value)}
            />
          </label>

          <label className="space-y-1 block">
            <span className="text-sm font-medium">Description</span>
            <textarea
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <label className="space-y-1 block">
            <span className="text-sm font-medium">Instructions</span>
            <textarea
              rows={8}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
            />
          </label>
        </div>

        {saveError ? (
          <div className="text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
            {saveError}
          </div>
        ) : null}
        {saveSuccess ? (
          <div className="text-xs text-green-700 dark:text-green-300 bg-green-500/10 border border-green-500/20 rounded-md px-3 py-2">
            Saved.
          </div>
        ) : null}

        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            setSaveError(null);
            setSaveSuccess(false);
            try {
              await onSave({
                pluginName,
                description,
                instructions
              });
              setSaveSuccess(true);
            } catch (err) {
              setSaveError(err instanceof Error ? err.message : "Failed to save plugin");
            } finally {
              setSaving(false);
            }
          }}
          className="inline-flex items-center gap-2 rounded-md bg-compass-blue text-white px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save
        </button>
      </section>

      <section className="panel p-4 space-y-3">
        <h2 className="font-semibold">Read-only plugin metadata</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {readonlyDetails &&
            Object.entries(readonlyDetails).map(([key, value]) => (
              <div key={key}>
                <div className="text-xs text-muted-foreground">{key}</div>
                <div className="break-all">{value ? String(value) : "-"}</div>
              </div>
            ))}
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="font-semibold mb-2">Input schema (read-only in v1)</h2>
        <pre className="text-xs bg-muted/30 p-3 rounded-md overflow-x-auto">
          {JSON.stringify(plugin.userInputs, null, 2)}
        </pre>
      </section>
    </div>
  );
}
