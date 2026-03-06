/**
 * 里程碑初始化引导组件
 * 当项目没有里程碑时显示，引导用户选择初始化方式
 */

import React, { useState } from 'react';
import { LayoutTemplate, PlusCircle, Lightbulb, Loader2 } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { TemplateSelectionModal } from './TemplateSelectionModal';

interface MilestoneInitGuideProps {
  projectId: string;
  onInit: (templateId?: string) => Promise<void>;
  loading?: boolean;
}

export function MilestoneInitGuide({ projectId, onInit, loading = false }: MilestoneInitGuideProps) {
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [initLoading, setInitLoading] = useState(false);

  const handleCustomInit = async () => {
    setInitLoading(true);
    try {
      await onInit(); // 不传 templateId 表示空白初始化
    } finally {
      setInitLoading(false);
    }
  };

  const handleTemplateSelect = async (templateId: string | null) => {
    setShowTemplateModal(false);
    if (templateId) {
      setInitLoading(true);
      try {
        await onInit(templateId);
      } finally {
        setInitLoading(false);
      }
    }
  };

  return (
    <>
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-4xl w-full">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            {/* 顶部标题区域 - 水平布局 */}
            <div className="flex items-center gap-6 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <LayoutTemplate className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  初始化项目里程碑
                </h2>
                <p className="text-gray-600 text-sm">
                  当前项目尚未设置里程碑阶段。请选择初始化方式，从模板快速创建或自定义配置。
                </p>
              </div>
            </div>

            {/* 选项卡片 - 水平布局 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* 选择模板 */}
              <button
                onClick={() => setShowTemplateModal(true)}
                disabled={initLoading || loading}
                className="group relative bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-5 text-left hover:border-blue-500 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                    <LayoutTemplate className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      选择模板初始化
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">
                      从预设模板快速创建里程碑阶段和任务
                    </p>
                    <div className="flex items-center text-xs text-blue-600 font-medium">
                      <span>查看可用模板</span>
                      <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </button>

              {/* 自定义空白 */}
              <button
                onClick={handleCustomInit}
                disabled={initLoading || loading}
                className="group relative bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-5 text-left hover:border-gray-400 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                    {initLoading ? (
                      <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                    ) : (
                      <PlusCircle className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      自定义空白里程碑
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">
                      从零开始，自由定义里程碑阶段和任务
                    </p>
                    <div className="flex items-center text-xs text-gray-500 font-medium">
                      <span>{initLoading ? '创建中...' : '开始自定义'}</span>
                      {!initLoading && (
                        <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* 提示信息 - 更紧凑 */}
            <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-3">
              <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700">
                <span className="font-medium">提示：</span>
                选择模板初始化后，您仍可以自定义修改阶段和任务。自定义配置还可以保存为模板供后续项目使用。
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 模板选择弹窗 */}
      <TemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleTemplateSelect}
      />
    </>
  );
}
