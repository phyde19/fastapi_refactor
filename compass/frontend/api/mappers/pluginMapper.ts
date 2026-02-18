import type { ApiPluginMenuEntry, ApiWorkspaceMenuGroup } from "@/schemas/api/plugin";
import type { PluginInputField, InputOption } from "@/schemas/domain/input";
import type { PluginMenuItemModel, WorkspaceMenuGroupModel } from "@/schemas/domain/plugin";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeOptions(value: unknown): InputOption[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((option): InputOption | null => {
      if (typeof option === "string") {
        return { label: option, value: option };
      }
      if (typeof option === "object" && option !== null) {
        const raw = option as Record<string, unknown>;
        const normalizedValue = asString(raw.value, "");
        const normalizedLabel = asString(raw.label, normalizedValue);
        if (!normalizedValue) {
          return null;
        }
        return { label: normalizedLabel, value: normalizedValue };
      }
      return null;
    })
    .filter((option): option is InputOption => option !== null);
}

function normalizeInputField(rawField: unknown): PluginInputField | null {
  if (!rawField || typeof rawField !== "object") {
    return null;
  }

  const field = rawField as Record<string, unknown>;
  const type = asString(field.type).toLowerCase();
  const name = asString(field.name).trim();
  const label = asString(field.label, name).trim();
  const description = asString(field.description);
  const required = asBoolean(field.required, false);

  if (!name || !label) {
    return null;
  }

  if (type === "text") {
    return {
      type: "text",
      name,
      label,
      description,
      required,
      placeholder: asString(field.placeholder),
      default: asString(field.default)
    };
  }

  if (type === "textarea") {
    return {
      type: "textarea",
      name,
      label,
      description,
      required,
      placeholder: asString(field.placeholder),
      rows: typeof field.rows === "number" ? field.rows : 3,
      default: asString(field.default)
    };
  }

  if (type === "select") {
    const options = normalizeOptions(field.options);
    if (!options.length) {
      return null;
    }
    const defaultValue = asString(field.default);
    return {
      type: "select",
      name,
      label,
      description,
      required,
      options,
      default: options.some((option) => option.value === defaultValue) ? defaultValue : options[0].value
    };
  }

  if (type === "multiselect") {
    const options = normalizeOptions(field.options);
    if (!options.length) {
      return null;
    }
    const defaultValues = Array.isArray(field.default)
      ? field.default.filter((value): value is string => typeof value === "string")
      : [];
    return {
      type: "multiselect",
      name,
      label,
      description,
      required,
      options,
      default: defaultValues
    };
  }

  if (type === "toggle") {
    return {
      type: "toggle",
      name,
      label,
      description,
      required,
      default: asBoolean(field.default, false)
    };
  }

  return null;
}

export function mapPluginEntry(entry: ApiPluginMenuEntry): PluginMenuItemModel {
  return {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    pluginType: entry.plugin_type,
    hasService: entry.has_service,
    conversationSeed: Array.isArray(entry.conversation_seed) ? entry.conversation_seed : [],
    userInputs: Array.isArray(entry.user_inputs)
      ? entry.user_inputs
          .map((rawField) => normalizeInputField(rawField))
          .filter((field): field is PluginInputField => field !== null)
      : []
  };
}

export function mapWorkspaceMenuGroup(group: ApiWorkspaceMenuGroup): WorkspaceMenuGroupModel {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    plugins: group.plugins.map(mapPluginEntry)
  };
}
