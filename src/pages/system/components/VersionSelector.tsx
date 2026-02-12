import React from 'react';
import { Plus } from 'lucide-react';

interface TemplateVersion {
  id: string;
  version_name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface VersionSelectorProps {
  versions: TemplateVersion[];
  selectedVersion: TemplateVersion | null;
  onSelectVersion: (version: TemplateVersion) => void;
  onCreateVersion: () => void;
  onSetActiveVersion: (version: TemplateVersion) => void;
}

export function VersionSelector({
  versions,
  selectedVersion,
  onSelectVersion,
  onCreateVersion,
  onSetActiveVersion
}: VersionSelectorProps) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900">版本管理</h3>
        <button
          onClick={onCreateVersion}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
        >
          <Plus className="w-4 h-4" />
          新建版本
        </button>
      </div>

      <div className="space-y-2">
        {versions.map((version) => (
          <div
            key={version.id}
            onClick={() => onSelectVersion(version)}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${
              selectedVersion?.id === version.id
                ? 'bg-indigo-50 border-2 border-indigo-500'
                : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900">{version.version_name}</h4>
                {version.is_active && (
                  <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                    当前使用
                  </span>
                )}
              </div>
              {!version.is_active && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetActiveVersion(version);
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  设为当前
                </button>
              )}
            </div>
            {version.description && (
              <p className="text-sm text-gray-500 mt-1">{version.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              创建于 {new Date(version.created_at).toLocaleDateString('zh-CN')}
            </p>
          </div>
        ))}

        {versions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>暂无版本</p>
            <button
              onClick={onCreateVersion}
              className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm"
            >
              创建第一个版本
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
