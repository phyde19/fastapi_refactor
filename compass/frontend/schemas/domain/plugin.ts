import type { PluginInputField } from "@/schemas/domain/input";

export interface PluginMenuItemModel {
  id: string;
  name: string;
  description: string;
  pluginType: string | null;
  userInputs: PluginInputField[];
  conversationSeed: Array<{ role: string; content: string }>;
  hasService: boolean;
}

export interface WorkspaceMenuGroupModel {
  id: string;
  name: string;
  description: string;
  plugins: PluginMenuItemModel[];
}

export interface PluginAdminRecordModel {
  pluginId: string;
  pluginName: string;
  workspaceId: string;
  workspaceName: string;
  description: string;
  workspaceDescription: string;
  position: number;
  enabled: boolean;
  instructions: string;
  conversationSeed: Array<{ role: string; content: string }>;
  userInputs: PluginInputField[];
  serviceKey: string | null;
  serviceType: string | null;
  pluginType: string | null;
  updatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WorkspaceAdminGroupModel {
  workspaceId: string;
  workspaceName: string;
  workspaceDescription: string;
  plugins: PluginAdminRecordModel[];
}
