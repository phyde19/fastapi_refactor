"use client";

import { useEffect } from "react";
import { useAdminPlugins } from "@/hooks/useAdminPlugins";
import { PluginsDashboard } from "@/features/admin/PluginsDashboard";

export default function PluginsPage() {
  const { groups, loading, error, loadGroups } = useAdminPlugins();

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  return (
    <div className="h-screen w-full overflow-y-auto p-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Plugin Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage plugin display metadata while keeping developer-defined input schema read-only in v1.
        </p>
      </div>
      <PluginsDashboard groups={groups} loading={loading} error={error} />
    </div>
  );
}
