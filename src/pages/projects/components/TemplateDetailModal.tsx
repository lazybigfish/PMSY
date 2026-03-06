/**
 * 模板详情弹窗组件
 * 展示模板的完整阶段和任务结构
 */

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Circle, User, Layers, ListTodo, Tag, Loader2 } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { getTemplateDetail, TemplatePhase } from '../../../services/systemService';

interface TemplateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  onUse: () => void;
}

export function TemplateDetailModal({ isOpen, onClose, templateId, onUse }: TemplateDetailModalProps) {
  const [template, setTemplate] = useState<any>(null);
  const [phases, setPhases] = useState<TemplatePhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && templateId) {
      fetchTemplateDetail();
    }
  }, [isOpen, templateId]);

  const fetchTemplateDetail = async () => {
    setLoading(true);
    try {
      console.log('[TemplateDetail] Fetching detail for templateId:', templateId);
      const data = await getTemplateDetail(templateId);
      console.log('[TemplateDetail] Received data:', data);
      if (data) {
        setTemplate(data.template);
        setPhases(data.phases);
        // 默认展开第一个阶段
        if (data.phases.length > 0) {
          setExpandedPhases(new Set([data.phases[0].id]));
        }
      } else {
        console.log('[TemplateDetail] No data received, template set to null');
      }
    } catch (error) {
      console.error('Error fetching template detail:', error);
      alert('获取模板详情失败');
    } finally {
      setLoading(false);
    }
  };

  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const totalTasks = phases.reduce((sum, phase) => sum + phase.tasks.length, 0);
  const requiredTasks = phases.reduce(
    (sum, phase) => sum + phase.tasks.filter((t: any) => t.isRequired).length,
    0
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="模板详情"
      maxWidth="3xl"
    >
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : !template ? (
        <div className="flex items-center justify-center h-96 text-gray-500">
          模板不存在或已删除
        </div>
      ) : (
        <div className="flex flex-col h-[500px] overflow-hidden">
          {/* 头部信息 - 固定 */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{template.name}</h2>
                  {template.is_system && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                      系统模板
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                    {template.version}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  {template.description || '暂无描述'}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {template.is_system ? '系统管理员' : template.created_by_name || '未知'}
                  </span>
                  <span className="flex items-center">
                    <Layers className="w-4 h-4 mr-1" />
                    {phases.length} 个阶段
                  </span>
                  <span className="flex items-center">
                    <ListTodo className="w-4 h-4 mr-1" />
                    {totalTasks} 个任务
                  </span>
                  <span className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    {requiredTasks} 个必需
                  </span>
                </div>
                {template.tags && template.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {template.tags.map((tag: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded flex items-center"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 阶段列表 - 唯一可滚动区域 */}
          <div className="flex-1 overflow-y-auto space-y-3 min-h-0 px-1">
            {phases.map((phase, phaseIndex) => (
              <div
                key={phase.id}
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                {/* 阶段头部 */}
                <button
                  onClick={() => togglePhase(phase.id)}
                  className="w-full bg-blue-50 px-4 py-3 flex items-center justify-between hover:bg-blue-100 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {phaseIndex + 1}
                    </span>
                    <h3 className="font-semibold text-gray-900">{phase.name}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {phase.tasks.length} 个任务
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        expandedPhases.has(phase.id) ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>

                {/* 任务列表 */}
                {expandedPhases.has(phase.id) && (
                  <div className="p-4">
                    {phase.tasks.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        该阶段暂无任务
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {phase.tasks.map((task, taskIndex) => (
                          <li
                            key={task.id}
                            className="flex items-start space-x-3 text-sm"
                          >
                            {task.is_required ? (
                              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <span className={task.is_required ? 'text-gray-900' : 'text-gray-600'}>
                                {task.name}
                              </span>
                              {task.is_required && (
                                <span className="ml-2 px-1.5 py-0.5 bg-green-50 text-green-600 text-xs rounded">
                                  必需
                                </span>
                              )}
                              {task.description && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 底部操作 - 固定 */}
          <div className="p-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0 bg-white">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              关闭
            </button>
            <button
              onClick={onUse}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              使用此模板
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
