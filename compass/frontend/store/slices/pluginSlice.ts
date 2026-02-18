import type { StateCreator } from "zustand";
import type { CompassStore, PluginSlice } from "@/store/types";

export const createPluginSlice: StateCreator<CompassStore, [], [], PluginSlice> = (set) => ({
  workspaceGroups: [],
  pluginMenuLoading: false,
  pluginMenuError: null,
  activeWorkspaceId: null,
  activePluginId: null,
  setWorkspaceGroups: (groups) => {
    set((state) => {
      if (!groups.length) {
        return {
          workspaceGroups: [],
          activeWorkspaceId: null,
          activePluginId: null
        };
      }

      const hasActiveWorkspace = state.activeWorkspaceId
        ? groups.some((group) => group.id === state.activeWorkspaceId)
        : false;

      const fallbackWorkspace = groups[0];
      const workspaceId = hasActiveWorkspace ? state.activeWorkspaceId : fallbackWorkspace.id;
      const selectedWorkspace = groups.find((group) => group.id === workspaceId) ?? fallbackWorkspace;

      const hasActivePlugin = state.activePluginId
        ? selectedWorkspace.plugins.some((plugin) => plugin.id === state.activePluginId)
        : false;

      const fallbackPluginId = selectedWorkspace.plugins[0]?.id ?? null;
      const pluginId = hasActivePlugin ? state.activePluginId : fallbackPluginId;

      return {
        workspaceGroups: groups,
        activeWorkspaceId: workspaceId,
        activePluginId: pluginId
      };
    });
  },
  setPluginMenuLoading: (value) => set({ pluginMenuLoading: value }),
  setPluginMenuError: (value) => set({ pluginMenuError: value }),
  setActiveWorkspace: (workspaceId) =>
    set((state) => {
      const workspace = state.workspaceGroups.find((group) => group.id === workspaceId);
      return {
        activeWorkspaceId: workspaceId,
        activePluginId: workspace?.plugins[0]?.id ?? null
      };
    }),
  setActivePlugin: (workspaceId, pluginId) =>
    set({
      activeWorkspaceId: workspaceId,
      activePluginId: pluginId
    })
});
