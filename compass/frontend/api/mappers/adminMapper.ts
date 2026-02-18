import type { ApiPluginRecord, ApiWorkspaceGroup } from "@/schemas/api/plugin";
import type { PluginInputField } from "@/schemas/domain/input";
import type { PluginAdminRecordModel, WorkspaceAdminGroupModel } from "@/schemas/domain/plugin";
import { mapPluginEntry } from "@/api/mappers/pluginMapper";

function parseJsonArray(value: string | null): unknown[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseConversationSeed(value: string | null): Array<{ role: string; content: string }> {
  const parsed = parseJsonArray(value);
  return parsed
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const candidate = item as Record<string, unknown>;
      if (typeof candidate.role !== "string" || typeof candidate.content !== "string") {
        return null;
      }
      return { role: candidate.role, content: candidate.content };
    })
    .filter((item): item is { role: string; content: string } => item !== null);
}

function parseUserInputs(value: string | null): PluginInputField[] {
  const parsed = parseJsonArray(value);
  const pseudoEntry = mapPluginEntry({
    id: "unused",
    name: "unused",
    description: "",
    plugin_type: null,
    user_inputs: parsed,
    conversation_seed: [],
    has_service: true
  });
  return pseudoEntry.userInputs;
}

export function mapPluginAdminRecord(record: ApiPluginRecord): PluginAdminRecordModel {
  return {
    pluginId: record.plugin_id,
    pluginName: record.plugin_name,
    workspaceId: record.workspace_id,
    workspaceName: record.workspace_name,
    description: record.description,
    workspaceDescription: record.workspace_description,
    position: record.position,
    enabled: record.enabled,
    instructions: record.instructions,
    conversationSeed: parseConversationSeed(record.conversation_seed),
    userInputs: parseUserInputs(record.user_inputs),
    serviceKey: record.service_key,
    serviceType: record.service_type,
    pluginType: record.plugin_type,
    updatedBy: record.updated_by,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

export function mapWorkspaceAdminGroup(group: ApiWorkspaceGroup): WorkspaceAdminGroupModel {
  return {
    workspaceId: group.workspace_id,
    workspaceName: group.workspace_name,
    workspaceDescription: group.workspace_description,
    plugins: group.plugins.map(mapPluginAdminRecord)
  };
}
