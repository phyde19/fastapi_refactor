export interface ApiPluginMenuEntry {
  id: string;
  name: string;
  description: string;
  plugin_type: string | null;
  user_inputs: unknown[];
  conversation_seed: Array<{ role: string; content: string }>;
  has_service: boolean;
}

export interface ApiWorkspaceMenuGroup {
  id: string;
  name: string;
  description: string;
  plugins: ApiPluginMenuEntry[];
}

export interface ApiPluginRecord {
  plugin_id: string;
  plugin_name: string;
  workspace_id: string;
  workspace_name: string;
  description: string;
  workspace_description: string;
  position: number;
  enabled: boolean;
  instructions: string;
  conversation_seed: string | null;
  user_inputs: string | null;
  service_key: string | null;
  service_type: string | null;
  plugin_type: string | null;
  updated_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApiWorkspaceGroup {
  workspace_id: string;
  workspace_name: string;
  workspace_description: string;
  plugins: ApiPluginRecord[];
}
