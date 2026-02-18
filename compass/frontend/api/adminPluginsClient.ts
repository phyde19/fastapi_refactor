import { ApiClient } from "@/api/client";
import { mapPluginAdminRecord, mapWorkspaceAdminGroup } from "@/api/mappers/adminMapper";
import type { ApiPluginConfigUpdate } from "@/schemas/api/admin";
import type { ApiPluginRecord, ApiWorkspaceGroup } from "@/schemas/api/plugin";
import type { PluginAdminRecordModel, WorkspaceAdminGroupModel } from "@/schemas/domain/plugin";

export async function fetchAdminPluginGroups(): Promise<WorkspaceAdminGroupModel[]> {
  const payload = await ApiClient.getJson<ApiWorkspaceGroup[]>("/plugins-config");
  return payload.map(mapWorkspaceAdminGroup);
}

export async function fetchAdminPlugin(
  workspaceId: string,
  pluginId: string
): Promise<PluginAdminRecordModel> {
  const payload = await ApiClient.getJson<ApiPluginRecord>(`/plugins-config/${workspaceId}/${pluginId}`);
  return mapPluginAdminRecord(payload);
}

export async function updateAdminPlugin(
  workspaceId: string,
  pluginId: string,
  update: ApiPluginConfigUpdate
): Promise<PluginAdminRecordModel> {
  const payload = await ApiClient.putJson<ApiPluginConfigUpdate, ApiPluginRecord>(
    `/plugins-config/${workspaceId}/${pluginId}/config`,
    update
  );
  return mapPluginAdminRecord(payload);
}
