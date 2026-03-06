/**
 * 模板选择弹窗组件
 * 用于初始化里程碑时选择模板
 */

import React, { useState, useEffect } from 'react';
import { X, Search, LayoutTemplate, Check, Eye, Loader2, Tag, User, Layers, ListTodo } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { TemplateDetailModal } from './TemplateDetailModal';
import { getAvailableTemplates, getTemplateDetail, MilestoneTemplate } from '../../../services/systemService';

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string | null) => void;
}

type TemplateType = 'all' | 'system' | 'public' | 'private';

export function TemplateSelectionModal({ isOpen, onClose, onSelect }: TemplateSelectionModalProps) {
  const [templates, setTemplates] = useState<MilestoneTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateType, setTemplateType] = useState<TemplateType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailTemplateId, setDetailTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, templateType]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await getAvailableTemplates({
        type: templateType,
        search: searchTerm || undefined,
      });
      setTemplates(data);
    } catch (error) {
      console.error('Error fetching templates:', error);
      alert('获取模板列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchTemplates();
  };

  const handleViewDetail = (templateId: string) => {
    setDetailTemplateId(templateId);
    setShowDetailModal(true);
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
  };

  const handleConfirm = () => {
    if (selectedTemplateId) {
      onSelect(selectedTemplateId);
    }
  };

  const handleBlankStart = () => {
    onSelect(null);
  };

  const filteredTemplates = templates.filter(t => {
    // 搜索筛选
    const matchesSearch = !searchTerm ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase());

    // 类型筛选
    // 全部模板: 包含所有模板 (templateType === 'all')
    // 系统模板: is_system === true
    // 公开模板: is_public === true 且不是系统模板
    // 我的模板: 创建者是当前用户 (is_my_template === true)
    let matchesType = true;
    if (templateType === 'system') {
      matchesType = t.is_system;
    } else if (templateType === 'public') {
      matchesType = t.is_public && !t.is_system;
    } else if (templateType === 'private') {
      matchesType = t.is_my_template === true;
    }

    return matchesSearch && matchesType;
  });

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="选择里程碑模板"
        maxWidth="5xl"
      >
        <div className="flex h-[480px] overflow-hidden">
          {/* 左侧筛选 - 固定不滚动 */}
          <div className="w-56 bg-gray-50 border-r border-gray-200 p-3 flex-shrink-0">
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wider">模板分类</h3>
              <div className="space-y-1">
                {[
                  { value: 'all', label: '全部', count: templates.length },
                  { value: 'system', label: '系统', count: templates.filter(t => t.is_system).length },
                  { value: 'public', label: '公开', count: templates.filter(t => t.is_public && !t.is_system).length },
                  { value: 'private', label: '我的', count: templates.filter(t => t.is_my_template === true).length },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setTemplateType(item.value as TemplateType)}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors ${
                      templateType === item.value
                        ? 'bg-white border border-blue-200 text-blue-600'
                        : 'hover:bg-white text-gray-700'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-xs text-gray-400">({item.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 标签筛选 */}
            <div>
              <h3 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wider">标签</h3>
              <div className="flex flex-wrap gap-1.5">
                {['政府', '软件', '工程', '敏捷'].map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded cursor-pointer hover:bg-gray-300 transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧区域 - 使用grid布局确保底部固定 */}
          <div className="flex-1 flex flex-col bg-white min-w-0">
            {/* 搜索框 - 固定 */}
            <div className="p-3 border-b border-gray-200 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索模板..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* 模板列表 - 唯一可滚动区域 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <LayoutTemplate className="w-12 h-12 mb-2 text-gray-300" />
                  <p className="text-sm">没有找到匹配的模板</p>
                </div>
              ) : (
                <>
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleSelectTemplate(template.id)}
                      className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                        selectedTemplateId === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        {/* 图标 */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          template.is_system
                            ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                            : template.is_public
                            ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                            : 'bg-gradient-to-br from-orange-500 to-red-600'
                        }`}>
                          <LayoutTemplate className="w-5 h-5 text-white" />
                        </div>

                        {/* 内容 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-0.5">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">
                              {template.name}
                            </h3>
                            {template.is_system && (
                              <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                                系统
                              </span>
                            )}
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                              {template.version}
                            </span>
                          </div>

                          <p className="text-xs text-gray-600 line-clamp-1 mb-1.5">
                            {template.description || '暂无描述'}
                          </p>

                          {/* 统计信息 */}
                          <div className="flex items-center space-x-3 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Layers className="w-3 h-3 mr-0.5" />
                              {template.phaseCount || 0}阶段
                            </span>
                            <span className="flex items-center">
                              <ListTodo className="w-3 h-3 mr-0.5" />
                              {template.taskCount || 0}任务
                            </span>
                            <span className="flex items-center">
                              <User className="w-3 h-3 mr-0.5" />
                              {template.is_system ? '系统' : template.created_by_name || '未知'}
                            </span>
                          </div>

                          {/* 标签 */}
                          {template.tags && template.tags.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {template.tags.slice(0, 2).map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {template.tags.length > 2 && (
                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                                  +{template.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex flex-col items-center space-y-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetail(template.id);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="查看详情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {selectedTemplateId === template.id && (
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 从空白开始 */}
                  <div
                    onClick={handleBlankStart}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-3 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-all"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl text-gray-400">+</span>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">从空白开始</h3>
                        <p className="text-xs text-gray-500">不选择模板，自行定义里程碑阶段</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 底部操作栏 - 固定 */}
            <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-shrink-0">
              <div className="text-xs text-gray-500 truncate max-w-[200px]">
                {selectedTemplate ? (
                  <span>
                    已选: <span className="font-medium text-gray-900">{selectedTemplate.name}</span>
                  </span>
                ) : (
                  '请选择一个模板或从空白开始'
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!selectedTemplateId}
                  className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* 模板详情弹窗 */}
      {detailTemplateId && (
        <TemplateDetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          templateId={detailTemplateId}
          onUse={() => {
            setShowDetailModal(false);
            onSelect(detailTemplateId);
          }}
        />
      )}
    </>
  );
}
