"use client";

import { useCallback } from "react";
import {
  fetchAdminPlugin,
  fetchAdminPluginGroups,
  updateAdminPlugin
} from "@/api/adminPluginsClient";
import { useCompassStore } from "@/store";

export function useAdminPlugins() {
  const groups = useCompassStore((state) => state.adminWorkspaceGroups);
  const activePlugin = useCompassStore((state) => state.activeAdminPlugin);
  const loading = useCompassStore((state) => state.adminLoading);
  const error = useCompassStore((state) => state.adminError);
  const setGroups = useCompassStore((state) => state.setAdminWorkspaceGroups);
  const setActivePlugin = useCompassStore((state) => state.setActiveAdminPlugin);
  const setLoading = useCompassStore((state) => state.setAdminLoading);
  const setError = useCompassStore((state) => state.setAdminError);
  const replaceAdminPlugin = useCompassStore((state) => state.replaceAdminPlugin);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchAdminPluginGroups();
      setGroups(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin plugin groups");
    } finally {
      setLoading(false);
    }
  }, [setError, setGroups, setLoading]);

  const openPlugin = useCallback(
    async (workspaceId: string, pluginId: string) => {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchAdminPlugin(workspaceId, pluginId);
        setActivePlugin(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load plugin details");
      } finally {
        setLoading(false);
      }
    },
    [setActivePlugin, setError, setLoading]
  );

  const savePlugin = useCallback(
    async (workspaceId: string, pluginId: string, update: { pluginName: string; description: string; instructions: string }) => {
      setLoading(true);
      setError(null);
      try {
        const payload = await updateAdminPlugin(workspaceId, pluginId, {
          plugin_name: update.pluginName,
          description: update.description,
          instructions: update.instructions
        });
        replaceAdminPlugin(payload);
        setActivePlugin(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update plugin");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [replaceAdminPlugin, setActivePlugin, setError, setLoading]
  );

  return {
    groups,
    activePlugin,
    loading,
    error,
    loadGroups,
    openPlugin,
    savePlugin
  };
}
