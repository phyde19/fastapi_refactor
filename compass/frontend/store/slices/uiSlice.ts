import type { StateCreator } from "zustand";
import type { CompassStore, UiSlice } from "@/store/types";

export const createUiSlice: StateCreator<CompassStore, [], [], UiSlice> = (set) => ({
  rightPanelMode: "inputs",
  selectedCitation: null,
  setRightPanelMode: (mode) => set({ rightPanelMode: mode }),
  setSelectedCitation: (citation) => set({ selectedCitation: citation })
});
