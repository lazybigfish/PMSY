/**
 * 模板详情弹窗组件
 */

import React, { useState, useEffect } from 'react';
import { X, Edit2, Ban, CheckCircle } from 'lucide-react';

interface MilestoneTemplate {
  id: string;
  name: string;
  version_number: string;
  description: string;
  is_active: boolean;
  is_system?: boolean;
  is_public?: boolean;
  tags?: string[];
  use_count?: number;
  created_by_name?: string;
  created_at: string;
  phaseCount?: number;
  taskCount?: number;
}

interface Phase {
  id: string;
  name: string;
  tasks: Task[];
}

interface Task {
  id: string;
  name: string;
  description?: string;
}

interface TemplateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: MilestoneTemplate | null;
  onEdit: () => void;
  onToggleStatus: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function TemplateDetailModal({
  isOpen,
  onClose,
  template,
  onEdit,
  onToggleStatus,
}: TemplateDetailModalProps) {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && template) {
      fetchPhases();
    }
  }, [isOpen, template]);

  const fetchPhases = async () => {
    if (!template) return;
    
    try {
      setLoading(true);
      // 获取阶段和任务数据
      const response = await fetch(`${API_BASE_URL}/admin/milestone-templates/${template.id}/detail`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      const result = await response.json();
      
      if (result.success) {
        setPhases(result.data.phases || []);
        // 默认展开第一个阶段
        if (result.data.phases?.length > 0) {
          setExpandedPhases(new Set([result.data.phases[0].id]));
        }
      }
    } catch (error) {
      console.error('Error fetching phases:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePhase = (phaseId: string) => {
    const newSet = new Set(expandedPhases);
    if (newSet.has(phaseId)) {
      newSet.delete(phaseId);
    } else {
      newSet.add(phaseId);
    }
    setExpandedPhases(newSet);
  };

  const getTypeBadge = () => {
    if (!template) return null;
    
    if (template.is_system) {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
          系统模板
        </span>
      );
    }
    if (template.is_public) {
      return (
        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
          公开模板
        </span>
      );
    }
    return (
      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
        私有模板
      </span>
    );
  };

  const getTemplateIcon = () => {
    if (!template) return null;
    
    if (template.is_system) {
      return (
        <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <i className="fas fa-flag-checkered text-white text-2xl"></i>
        </div>
      );
    }
    if (template.is_public) {
      return (
        <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
          <i className="fas fa-rocket text-white text-2xl"></i>
        </div>
      );
    }
    return (
      <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
        <i className="fas fa-lock text-white text-2xl"></i>
      </div>
    );
  };

  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">模板详情</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-140px)] p-6">
          {/* Template Info */}
          <div className="flex items-start mb-6">
            {getTemplateIcon()}
            <div className="ml-4 flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {template.name} {template.version_number}
              </h2>
              <div className="flex items-center space-x-3 mt-2 text-sm text-gray-500">
                <span>版本: {template.version_number}</span>
                <span>·</span>
                {getTypeBadge()}
                <span>·</span>
                <span className={template.is_active ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {template.is_active ? '● 已启用' : '● 已禁用'}
                </span>
              </div>
              {template.tags && template.tags.length > 0 && (
                <div className="flex items-center space-x-2 mt-2">
                  {template.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {template.description && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">{template.description}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{template.phaseCount || 0}</div>
              <div className="text-xs text-gray-500 mt-1">阶段数</div>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{template.taskCount || 0}</div>
              <div className="text-xs text-gray-500 mt-1">任务数</div>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">{template.use_count || 0}</div>
              <div className="text-xs text-gray-500 mt-1">使用次数</div>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">
                {new Date(template.created_at).toLocaleDateString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">创建时间</div>
            </div>
          </div>

          {/* Phases */}
          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">
            阶段与任务详情
          </h4>
          
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : phases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无阶段数据</div>
          ) : (
            <div className="space-y-2">
              {phases.map((phase) => (
                <div key={phase.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div
                    className="bg-gray-50 px-4 py-2 flex items-center justify-between cursor-pointer"
                    onClick={() => togglePhase(phase.id)}
                  >
                    <div className="flex items-center">
                      <i
                        className={`fas fa-chevron-${expandedPhases.has(phase.id) ? 'down' : 'right'} text-gray-400 mr-2 text-xs`}
                      ></i>
                      <span className="text-sm font-medium text-gray-900">{phase.name}</span>
                      <span className="ml-2 text-xs text-gray-500">({phase.tasks?.length || 0}个任务)</span>
                    </div>
                  </div>
                  {expandedPhases.has(phase.id) && phase.tasks && phase.tasks.length > 0 && (
                    <div className="px-4 py-2 space-y-1">
                      {phase.tasks.map((task) => (
                        <div key={task.id} className="flex items-center text-sm text-gray-600 py-1">
                          <i className="far fa-square text-gray-400 mr-2 text-xs"></i>
                          <span>{task.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors text-sm"
          >
            关闭
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
          >
            编辑
          </button>
          <button
            onClick={onToggleStatus}
            className={`px-4 py-2 text-white rounded-md transition-colors text-sm ${
              template.is_active
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {template.is_active ? '禁用' : '启用'}
          </button>
        </div>
      </div>
    </div>
  );
}
