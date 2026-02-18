import { ApiClient } from "@/api/client";
import { mapWorkspaceMenuGroup } from "@/api/mappers/pluginMapper";
import type { ApiWorkspaceMenuGroup } from "@/schemas/api/plugin";
import type { WorkspaceMenuGroupModel } from "@/schemas/domain/plugin";

export async function fetchPluginMenu(): Promise<WorkspaceMenuGroupModel[]> {
  const payload = await ApiClient.getJson<ApiWorkspaceMenuGroup[]>("/plugins");
  return payload.map(mapWorkspaceMenuGroup);
}
