// AI 配置类型定义

export interface AIProvider {
  id: string;
  name: string;
  api_endpoint: string;
  api_key: string;
  model: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIRole {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
  is_active: boolean;
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}
