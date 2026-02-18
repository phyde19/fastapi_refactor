import type { StateCreator } from "zustand";
import type { AdminSlice, CompassStore } from "@/store/types";

export const createAdminSlice: StateCreator<CompassStore, [], [], AdminSlice> = (set) => ({
  adminWorkspaceGroups: [],
  activeAdminPlugin: null,
  adminLoading: false,
  adminError: null,
  setAdminWorkspaceGroups: (groups) => set({ adminWorkspaceGroups: groups }),
  setActiveAdminPlugin: (plugin) => set({ activeAdminPlugin: plugin }),
  setAdminLoading: (value) => set({ adminLoading: value }),
  setAdminError: (value) => set({ adminError: value }),
  replaceAdminPlugin: (plugin) =>
    set((state) => ({
      adminWorkspaceGroups: state.adminWorkspaceGroups.map((group) => {
        if (group.workspaceId !== plugin.workspaceId) {
          return group;
        }
        return {
          ...group,
          plugins: group.plugins.map((entry) =>
            entry.pluginId === plugin.pluginId ? plugin : entry
          )
        };
      }),
      activeAdminPlugin:
        state.activeAdminPlugin &&
        state.activeAdminPlugin.workspaceId === plugin.workspaceId &&
        state.activeAdminPlugin.pluginId === plugin.pluginId
          ? plugin
          : state.activeAdminPlugin
    }))
});
