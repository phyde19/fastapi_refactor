import type { StateCreator } from "zustand";
import type { PluginInputField, InputValue } from "@/schemas/domain/input";
import type { CompassStore, InputSlice } from "@/store/types";

function defaultValueForField(field: PluginInputField): InputValue {
  if (field.type === "toggle") {
    return field.default ?? false;
  }
  if (field.type === "multiselect") {
    return field.default ?? [];
  }
  if (field.type === "select") {
    if (field.default) {
      return field.default;
    }
    return field.options[0]?.value ?? "";
  }
  if (field.type === "text" || field.type === "textarea") {
    return field.default ?? "";
  }
  return null;
}

function hasValue(field: PluginInputField, value: InputValue): boolean {
  if (field.type === "multiselect") {
    return Array.isArray(value) && value.length > 0;
  }
  if (field.type === "toggle") {
    return typeof value === "boolean";
  }
  if (typeof value === "number") {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return value !== null;
}

export const createInputSlice: StateCreator<CompassStore, [], [], InputSlice> = (set, get) => ({
  inputValuesByPluginKey: {},
  inputErrorsByPluginKey: {},
  hydrateInputDefaults: (pluginStateKey, schema) =>
    set((state) => {
      const currentValues = state.inputValuesByPluginKey[pluginStateKey] ?? {};
      const nextValues = { ...currentValues };
      for (const field of schema) {
        if (!(field.name in nextValues)) {
          nextValues[field.name] = defaultValueForField(field);
        }
      }
      return {
        inputValuesByPluginKey: {
          ...state.inputValuesByPluginKey,
          [pluginStateKey]: nextValues
        }
      };
    }),
  setInputValue: (pluginStateKey, inputName, value) =>
    set((state) => {
      const nextValues = {
        ...(state.inputValuesByPluginKey[pluginStateKey] ?? {}),
        [inputName]: value
      };
      const existingErrors = state.inputErrorsByPluginKey[pluginStateKey] ?? {};
      if (existingErrors[inputName]) {
        const nextErrors = { ...existingErrors };
        delete nextErrors[inputName];
        return {
          inputValuesByPluginKey: {
            ...state.inputValuesByPluginKey,
            [pluginStateKey]: nextValues
          },
          inputErrorsByPluginKey: {
            ...state.inputErrorsByPluginKey,
            [pluginStateKey]: nextErrors
          }
        };
      }
      return {
        inputValuesByPluginKey: {
          ...state.inputValuesByPluginKey,
          [pluginStateKey]: nextValues
        }
      };
    }),
  clearInputErrors: (pluginStateKey) =>
    set((state) => ({
      inputErrorsByPluginKey: {
        ...state.inputErrorsByPluginKey,
        [pluginStateKey]: {}
      }
    })),
  validatePluginInputs: (pluginStateKey, schema) => {
    const values = get().inputValuesByPluginKey[pluginStateKey] ?? {};
    const errors: Record<string, string> = {};

    for (const field of schema) {
      const value = values[field.name];
      if (field.required && !hasValue(field, value ?? null)) {
        errors[field.name] = `${field.label} is required`;
      }
    }

    set((state) => ({
      inputErrorsByPluginKey: {
        ...state.inputErrorsByPluginKey,
        [pluginStateKey]: errors
      }
    }));

    return Object.keys(errors).length === 0;
  },
  serializePluginInputs: (pluginStateKey, schema) => {
    const values = get().inputValuesByPluginKey[pluginStateKey] ?? {};
    return schema.map((field) => ({
      name: field.name,
      value: values[field.name] ?? defaultValueForField(field)
    }));
  },
  resetPluginInputs: (pluginStateKey) =>
    set((state) => ({
      inputValuesByPluginKey: {
        ...state.inputValuesByPluginKey,
        [pluginStateKey]: {}
      },
      inputErrorsByPluginKey: {
        ...state.inputErrorsByPluginKey,
        [pluginStateKey]: {}
      }
    }))
});
