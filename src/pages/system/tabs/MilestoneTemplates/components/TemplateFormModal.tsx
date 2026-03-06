/**
 * 模板表单弹窗组件
 * 用于新建/编辑里程碑模板，包含阶段和任务配置
 */

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Phase {
  id: string;
  name: string;
  description?: string;
  tasks: Task[];
}

interface OutputDocument {
  name: string;
  required?: boolean;
}

interface Task {
  id: string;
  name: string;
  description?: string;
  is_required?: boolean;
  output_documents?: OutputDocument[];
}

interface MilestoneTemplate {
  id: string;
  name: string;
  version_number: string;
  description: string;
  is_active: boolean;
  is_system?: boolean;
  is_public?: boolean;
  tags?: string[];
}

interface TemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: MilestoneTemplate | null;
  onSuccess: () => void;
}

export function TemplateFormModal({
  isOpen,
  onClose,
  template,
  onSuccess,
}: TemplateFormModalProps) {
  const isEditMode = !!template;

  // 获取当前用户角色
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    // 从 localStorage 获取用户信息
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role || '');
      } catch {
        setUserRole('');
      }
    }
  }, []);

  const isAdmin = userRole === 'admin';

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    version_number: '',
    description: '',
    is_public: true,
    is_active: true,
    is_system: false,
    tags: [] as string[],
  });
  
  const [phases, setPhases] = useState<Phase[]>([]);
  const [newTag, setNewTag] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingPhases, setLoadingPhases] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());

  // Initialize form data when editing
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        version_number: template.version_number || '',
        description: template.description || '',
        is_public: template.is_public !== false,
        is_active: template.is_active !== false,
        is_system: template.is_system === true,
        tags: template.tags || [],
      });
      // 加载阶段和任务
      fetchPhases();
    } else {
      // Reset for new template
      setFormData({
        name: '',
        version_number: 'V1.0',
        description: '',
        is_public: true,
        is_active: true,
        is_system: false,
        tags: [],
      });
      setPhases([]);
    }
  }, [template, isOpen]);

  const fetchPhases = async () => {
    if (!template) return;
    
    try {
      setLoadingPhases(true);
      const response = await fetch(`${API_BASE_URL}/admin/milestone-templates/${template.id}/detail`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
      });
      const result = await response.json();
      
      if (result.success) {
        // 解析 output_documents，处理可能的字符串格式
        const processedPhases = (result.data.phases || []).map((phase: any) => ({
          ...phase,
          tasks: (phase.tasks || []).map((task: any) => {
            let docs = task.output_documents;
            // 如果是字符串，解析为对象
            if (typeof docs === 'string') {
              try {
                docs = JSON.parse(docs);
              } catch {
                docs = [];
              }
            }
            // 确保是数组
            if (!Array.isArray(docs)) {
              docs = [];
            }
            return {
              ...task,
              output_documents: docs,
            };
          }),
        }));
        setPhases(processedPhases);
        // 默认展开所有阶段
        const allIndexes = new Set<number>();
        processedPhases.forEach((_: any, index: number) => allIndexes.add(index));
        setExpandedPhases(allIndexes);
      }
    } catch (error) {
      console.error('Error fetching phases:', error);
    } finally {
      setLoadingPhases(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  // Phase operations
  const handleAddPhase = () => {
    const newPhase: Phase = {
      id: `new_${Date.now()}`,
      name: `阶段${phases.length + 1}`,
      tasks: [],
    };
    setPhases([...phases, newPhase]);
    setExpandedPhases(new Set([...expandedPhases, phases.length]));
  };

  const handleRemovePhase = (index: number) => {
    const newPhases = phases.filter((_, i) => i !== index);
    setPhases(newPhases);
    // 更新 expandedPhases
    const newExpanded = new Set<number>();
    newPhases.forEach((_, i) => newExpanded.add(i));
    setExpandedPhases(newExpanded);
  };

  const handleUpdatePhase = (index: number, field: string, value: string) => {
    const newPhases = [...phases];
    (newPhases[index] as any)[field] = value;
    setPhases(newPhases);
  };

  const togglePhase = (index: number) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedPhases(newExpanded);
  };

  // Task operations
  const handleAddTask = (phaseIndex: number) => {
    const newPhases = [...phases];
    newPhases[phaseIndex].tasks.push({
      id: `new_task_${Date.now()}`,
      name: `新任务`,
      is_required: false,
      output_documents: [],
    });
    setPhases(newPhases);
  };

  const handleRemoveTask = (phaseIndex: number, taskIndex: number) => {
    const newPhases = [...phases];
    newPhases[phaseIndex].tasks = newPhases[phaseIndex].tasks.filter((_, i) => i !== taskIndex);
    setPhases(newPhases);
  };

  const handleUpdateTask = (phaseIndex: number, taskIndex: number, field: string, value: any) => {
    const newPhases = [...phases];
    (newPhases[phaseIndex].tasks[taskIndex] as any)[field] = value;
    setPhases(newPhases);
  };

  // Output documents operations
  const handleAddOutputDoc = (phaseIndex: number, taskIndex: number) => {
    const newPhases = [...phases];
    let docs = newPhases[phaseIndex].tasks[taskIndex].output_documents;
    // 确保 output_documents 是数组
    if (!Array.isArray(docs)) {
      docs = [];
      newPhases[phaseIndex].tasks[taskIndex].output_documents = docs;
    }
    docs.push({ name: '', required: true });
    setPhases(newPhases);
  };

  const handleUpdateOutputDoc = (phaseIndex: number, taskIndex: number, docIndex: number, field: string, value: any) => {
    const newPhases = [...phases];
    const docs = newPhases[phaseIndex].tasks[taskIndex].output_documents;
    if (Array.isArray(docs) && docs[docIndex]) {
      (docs[docIndex] as any)[field] = value;
    }
    setPhases(newPhases);
  };

  const handleRemoveOutputDoc = (phaseIndex: number, taskIndex: number, docIndex: number) => {
    const newPhases = [...phases];
    const docs = newPhases[phaseIndex].tasks[taskIndex].output_documents;
    if (Array.isArray(docs)) {
      newPhases[phaseIndex].tasks[taskIndex].output_documents = docs.filter((_, i) => i !== docIndex);
    }
    setPhases(newPhases);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.version_number) {
      alert('请填写模板名称和版本号');
      return;
    }

    try {
      setSubmitting(true);
      
      // 先保存模板基本信息
      const url = isEditMode 
        ? `${API_BASE_URL}/admin/milestone-templates/${template.id}`
        : `${API_BASE_URL}/admin/milestone-templates`;
      
      const method = isEditMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      
      if (!result.success) {
        alert(result.message || (isEditMode ? '更新失败' : '创建失败'));
        setSubmitting(false);
        return;
      }

      const templateId = isEditMode ? template.id : result.data.id;

      // 如果有阶段和任务，保存它们
      if (phases.length > 0) {
        await savePhases(templateId);
      }

      alert(isEditMode ? '更新成功' : '创建成功');
      onSuccess();
    } catch (error) {
      console.error('Error saving template:', error);
      alert(isEditMode ? '更新失败' : '创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 保存阶段和任务
  const savePhases = async (templateId: string) => {
    // 获取现有阶段和任务，用于对比
    const existingResponse = await fetch(`${API_BASE_URL}/admin/milestone-templates/${templateId}/detail`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    });
    const existingResult = await existingResponse.json();
    const existingPhases = existingResult.success ? existingResult.data.phases : [];

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      let phaseId = phase.id;

      // 如果是新阶段（id 以 new_ 开头），需要创建
      if (phase.id.startsWith('new_')) {
        const createPhaseRes = await fetch(`${API_BASE_URL}/admin/milestone-templates/${templateId}/phases`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({
            name: phase.name,
            description: phase.description,
            phase_order: i,
          }),
        });
        const createPhaseResult = await createPhaseRes.json();
        
        if (!createPhaseResult.success) {
          console.error('Failed to create phase:', createPhaseResult.message);
          continue;
        }
        phaseId = createPhaseResult.data.id;
      } else {
        // 更新已有阶段
        await fetch(`${API_BASE_URL}/admin/milestone-templates/${templateId}/phases/${phaseId}/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({
            name: phase.name,
            description: phase.description,
            phase_order: i,
          }),
        });
      }

      // 处理任务
      const existingPhase = existingPhases.find((p: any) => p.id === phaseId);
      const existingTaskIds = existingPhase ? existingPhase.tasks.map((t: any) => t.id) : [];

      for (let j = 0; j < phase.tasks.length; j++) {
        const task = phase.tasks[j];
        // 过滤空的产出物（name 为空的）
        const rawDocs = Array.isArray(task.output_documents) ? task.output_documents : [];
        const outputDocs = rawDocs
          .filter((d: any) => d.name && d.name.trim() !== '')
          .map((d: any) => ({ name: d.name, required: d.required !== false }));

        if (task.id.startsWith('new_task_')) {
          // 创建新任务
          await fetch(`${API_BASE_URL}/admin/milestone-templates/${templateId}/phases/${phaseId}/tasks`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
            body: JSON.stringify({
              name: task.name,
              description: task.description,
              is_required: task.is_required || false,
              output_documents: outputDocs,
            }),
          });
        } else if (existingTaskIds.includes(task.id)) {
          // 更新已有任务
          await fetch(`${API_BASE_URL}/admin/milestone-templates/${templateId}/phases/${phaseId}/tasks/${task.id}/update`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
            body: JSON.stringify({
              name: task.name,
              description: task.description,
              is_required: task.is_required || false,
              output_documents: outputDocs,
            }),
          });
        }
      }

      // 删除已被移除的任务
      for (const existingTask of (existingPhase?.tasks || [])) {
        if (!phase.tasks.find((t: any) => t.id === existingTask.id)) {
          await fetch(`${API_BASE_URL}/admin/milestone-templates/${templateId}/phases/${phaseId}/tasks/${existingTask.id}/delete`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
          });
        }
      }
    }

    // 删除已被移除的阶段
    for (const existingPhase of existingPhases) {
      if (!phases.find((p: any) => p.id === existingPhase.id)) {
        await fetch(`${API_BASE_URL}/admin/milestone-templates/${templateId}/phases/${existingPhase.id}/delete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEditMode ? '编辑里程碑模板' : '新建里程碑模板'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  模板名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如：标准项目里程碑模板"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  版本号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.version_number}
                  onChange={(e) => setFormData({ ...formData, version_number: e.target.value })}
                  placeholder="如：V1.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="请输入模板描述..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
              />
            </div>

            {/* Tags, Visibility, Status */}
            <div className="grid grid-cols-3 gap-4">
              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
                <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[38px]">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded flex items-center"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      placeholder="+ 添加"
                      className="text-xs border-none focus:ring-0 p-0 w-16"
                    />
                  </div>
                </div>
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">可见性</label>
                <div className="flex items-center space-x-4 mt-2">
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      checked={!formData.is_public}
                      onChange={() => setFormData({ ...formData, is_public: false })}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2">私有</span>
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      checked={formData.is_public}
                      onChange={() => setFormData({ ...formData, is_public: true })}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2">公开</span>
                  </label>
                </div>
              </div>

              {/* System Template - 仅管理员可见 */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">模板类型</label>
                  <div className="flex items-center space-x-4 mt-2">
                    <label className="flex items-center text-sm">
                      <input
                        type="radio"
                        checked={!formData.is_system}
                        onChange={() => setFormData({ ...formData, is_system: false })}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2">普通模板</span>
                    </label>
                    <label className="flex items-center text-sm">
                      <input
                        type="radio"
                        checked={formData.is_system}
                        onChange={() => setFormData({ ...formData, is_system: true })}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-2">系统模板</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <div className="flex items-center space-x-4 mt-2">
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      checked={formData.is_active}
                      onChange={() => setFormData({ ...formData, is_active: true })}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2">启用</span>
                  </label>
                  <label className="flex items-center text-sm">
                    <input
                      type="radio"
                      checked={!formData.is_active}
                      onChange={() => setFormData({ ...formData, is_active: false })}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2">禁用</span>
                  </label>
                </div>
              </div>
            </div>

            {/* 里程碑阶段配置 */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">里程碑阶段配置</h4>
              
              {loadingPhases ? (
                <div className="text-center py-4 text-gray-500">加载中...</div>
              ) : (
                <div className="space-y-3">
                  {phases.map((phase, phaseIndex) => (
                    <div key={phase.id} className="bg-gray-50 rounded-lg border border-gray-200">
                      {/* 阶段标题 */}
                      <div className="flex items-center justify-between p-3 border-b border-gray-200">
                        <div className="flex items-center">
                          <button
                            onClick={() => togglePhase(phaseIndex)}
                            className="mr-2 text-gray-500 hover:text-gray-700"
                          >
                            {expandedPhases.has(phaseIndex) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          <input
                            type="text"
                            value={phase.name}
                            onChange={(e) => handleUpdatePhase(phaseIndex, 'name', e.target.value)}
                            className="bg-transparent border-none focus:outline-none focus:ring-0 text-sm font-medium text-gray-900"
                            placeholder="阶段名称"
                          />
                          <span className="ml-2 text-xs text-gray-500">({phase.tasks.length}个任务)</span>
                        </div>
                        <button
                          onClick={() => handleRemovePhase(phaseIndex)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* 任务列表 */}
                      {expandedPhases.has(phaseIndex) && (
                        <div className="p-3 space-y-2">
                          {phase.tasks.map((task, taskIndex) => (
                            <div key={task.id} className="bg-white p-2 rounded border border-gray-200 mb-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center flex-1">
                                  <input
                                    type="checkbox"
                                    checked={task.is_required || false}
                                    onChange={(e) => handleUpdateTask(phaseIndex, taskIndex, 'is_required', e.target.checked)}
                                    className="mr-2 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                  />
                                  <input
                                    type="text"
                                    value={task.name}
                                    onChange={(e) => handleUpdateTask(phaseIndex, taskIndex, 'name', e.target.value)}
                                    className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-gray-700"
                                    placeholder="任务名称"
                                  />
                                </div>
                                <button
                                  onClick={() => handleRemoveTask(phaseIndex, taskIndex)}
                                  className="text-gray-400 hover:text-red-500 ml-2"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                              
                              {/* 产出物清单 */}
                              <div className="mt-2 pl-6">
                                <div className="text-xs text-gray-500 mb-1">产出物清单：</div>
                                {Array.isArray(task.output_documents) && task.output_documents.map((doc: any, docIndex: number) => (
                                  <div key={docIndex} className="flex items-center mb-1">
                                    <input
                                      type="checkbox"
                                      checked={doc?.required || false}
                                      onChange={(e) => handleUpdateOutputDoc(phaseIndex, taskIndex, docIndex, 'required', e.target.checked)}
                                      className="mr-1 w-3 h-3 text-indigo-600 rounded"
                                      title="是否必填"
                                    />
                                    <input
                                      type="text"
                                      value={doc?.name || ''}
                                      onChange={(e) => handleUpdateOutputDoc(phaseIndex, taskIndex, docIndex, 'name', e.target.value)}
                                      className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      placeholder="产出物名称"
                                    />
                                    <button
                                      onClick={() => handleRemoveOutputDoc(phaseIndex, taskIndex, docIndex)}
                                      className="ml-1 text-gray-400 hover:text-red-500"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  onClick={() => handleAddOutputDoc(phaseIndex, taskIndex)}
                                  className="text-xs text-indigo-600 hover:text-indigo-800"
                                >
                                  + 添加产出物
                                </button>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => handleAddTask(phaseIndex)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            添加任务
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={handleAddPhase}
                    className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors text-sm font-medium flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加新阶段
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors text-sm"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !formData.name || !formData.version_number}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
