/**
 * 保存为模板弹窗组件
 * 将当前项目里程碑保存为模板
 */

import React, { useState, useEffect } from 'react';
import { X, Tag, Lightbulb, Loader2, Plus, Check } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { saveProjectAsTemplate, getTemplateTags } from '../../../services/systemService';

interface SaveAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  milestones: any[];
  onSuccess: () => void;
}

export function SaveAsTemplateModal({
  isOpen,
  onClose,
  projectId,
  milestones,
  onSuccess,
}: SaveAsTemplateModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    version: 'V1.0',
    description: '',
    tags: [] as string[],
    isPublic: true,
    includePhases: true,
    includeTasks: true,
    includeOutputDocs: true,
  });
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // 计算任务数量
  const taskCount = milestones.reduce((sum, m) => sum + (m.tasks?.length || 0), 0);

  useEffect(() => {
    if (isOpen) {
      fetchTags();
      // 默认使用项目名称作为模板名称
      if (milestones.length > 0 && !formData.name) {
        setFormData(prev => ({
          ...prev,
          name: `${milestones[0]?.project_name || '项目'}里程碑模板`,
        }));
      }
    }
  }, [isOpen]);

  const fetchTags = async () => {
    try {
      const tags = await getTemplateTags();
      setAvailableTags(tags.map(t => t.name));
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const handleAddRecommendedTag = (tag: string) => {
    if (!formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('请输入模板名称');
      return;
    }
    if (!formData.version.trim()) {
      alert('请输入版本号');
      return;
    }

    setSaving(true);
    try {
      await saveProjectAsTemplate({
        projectId,
        name: formData.name.trim(),
        version: formData.version.trim(),
        description: formData.description.trim(),
        tags: formData.tags,
        isPublic: formData.isPublic,
        includePhases: formData.includePhases,
        includeTasks: formData.includeTasks,
        includeOutputDocs: formData.includeOutputDocs,
      });

      alert('模板保存成功');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving template:', error);
      alert(error.message || '保存模板失败');
    } finally {
      setSaving(false);
    }
  };

  const recommendedTags = ['政府项目', '软件开发', '工程建设', '敏捷开发'].filter(
    tag => !formData.tags.includes(tag)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="保存为里程碑模板"
      maxWidth="2xl"
    >
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {/* 基本信息 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            基本信息
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                模板名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="如：XX项目里程碑模板"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                版本号 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                placeholder="如：V1.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="描述该模板的适用场景和特点..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* 标签 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            标签
          </h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full flex items-center"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-2 text-blue-500 hover:text-blue-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              placeholder="输入标签后按回车添加"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleAddTag}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              添加
            </button>
          </div>
          {recommendedTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">推荐标签：</span>
              {recommendedTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleAddRecommendedTag(tag)}
                  className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded hover:bg-gray-200 transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 可见性设置 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            可见性设置
          </h3>
          <div className="space-y-3">
            <label className="flex items-start p-4 border border-blue-500 bg-blue-50 rounded-lg cursor-pointer">
              <input
                type="radio"
                name="visibility"
                checked={formData.isPublic}
                onChange={() => setFormData(prev => ({ ...prev, isPublic: true }))}
                className="mt-1 w-4 h-4 text-blue-600"
              />
              <div className="ml-3">
                <div className="flex items-center">
                  <span className="font-medium text-gray-900">公开</span>
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">推荐</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  所有用户都可以在初始化里程碑时选择使用此模板
                </p>
              </div>
            </label>
            <label className="flex items-start p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="visibility"
                checked={!formData.isPublic}
                onChange={() => setFormData(prev => ({ ...prev, isPublic: false }))}
                className="mt-1 w-4 h-4 text-blue-600"
              />
              <div className="ml-3">
                <span className="font-medium text-gray-900">私有</span>
                <p className="text-sm text-gray-600 mt-1">
                  仅自己可见，只有自己可以在初始化里程碑时选择使用
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* 包含内容 */}
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            包含内容
          </h3>
          <div className="space-y-3">
            <label className="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={formData.includePhases}
                onChange={(e) => setFormData(prev => ({ ...prev, includePhases: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div className="ml-3 flex-1">
                <span className="text-sm font-medium text-gray-900">阶段结构</span>
                <span className="ml-2 text-sm text-gray-500">（{milestones.length} 个阶段）</span>
              </div>
            </label>
            <label className="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={formData.includeTasks}
                onChange={(e) => setFormData(prev => ({ ...prev, includeTasks: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div className="ml-3 flex-1">
                <span className="text-sm font-medium text-gray-900">任务列表</span>
                <span className="ml-2 text-sm text-gray-500">（{taskCount} 个任务）</span>
              </div>
            </label>
            <label className="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={formData.includeOutputDocs}
                onChange={(e) => setFormData(prev => ({ ...prev, includeOutputDocs: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <div className="ml-3 flex-1">
                <span className="text-sm font-medium text-gray-900">输出物配置</span>
                <span className="ml-2 text-sm text-gray-500">（文档模板和必填设置）</span>
              </div>
            </label>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">💡 提示</p>
              <p>
                保存后可在"系统管理 &gt; 里程碑模板管理"中查看和管理此模板。
                公开模板需要管理员审核后才会对所有用户可见。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作 */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end space-x-3">
        <button
          onClick={onClose}
          disabled={saving}
          className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !formData.name.trim() || !formData.version.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            '确认保存'
          )}
        </button>
      </div>
    </Modal>
  );
}
