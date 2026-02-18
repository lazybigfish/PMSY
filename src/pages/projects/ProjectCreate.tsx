import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, apiClient } from '../../lib/api';
import { useAuth } from '../../context/AuthContextNew';
import { useTheme } from '../../context/ThemeContext';
import { Loader2 } from 'lucide-react';
import { Client } from '../../types';
import { numberToChinese } from '../../lib/utils';
import { ThemedModal } from '../../components/theme/ThemedModal';
import { ThemedButton } from '../../components/theme/ThemedButton';

// 表单数据接口
interface ProjectFormData {
  name: string;
  customer_name: string;
  amount: string;
  description: string;
  is_public: boolean;
  client_id: string;
}

// 模板版本信息
interface TemplateVersion {
  id: string;
  name: string;
  version_number: number;
  description: string;
}

const ProjectCreate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { themeConfig } = useTheme();
  const { colors } = themeConfig;
  const isDark = colors.background.main === '#0A0A0F';

  // 状态管理
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientSelect, setShowClientSelect] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [templateVersion, setTemplateVersion] = useState<TemplateVersion | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    customer_name: '',
    amount: '',
    description: '',
    is_public: false,
    client_id: '',
  });

  // 错误弹窗状态
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  // 初始化：获取客户列表和模板版本信息
  useEffect(() => {
    fetchClients();
    fetchTemplateVersion();
  }, []);

  // 获取客户列表
  const fetchClients = async () => {
    try {
      const { data, error } = await api.db
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('获取客户列表失败:', error);
    }
  };

  // 获取当前激活的模板版本信息（仅用于展示）
  const fetchTemplateVersion = async () => {
    try {
      const data = await apiClient.get<{ version: TemplateVersion | null }>('/rest/v1/milestone-templates/active');
      setTemplateVersion(data.version);
    } catch (error: any) {
      if (error?.message?.includes('404')) {
        // 没有激活的模板版本，这是正常的
        console.log('没有激活的里程碑模板版本');
      } else {
        console.error('获取模板版本失败:', error);
      }
      // 静默处理，不影响用户创建项目
      setTemplateVersion(null);
    }
  };

  // 选择客户
  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setFormData(prev => ({
      ...prev,
      customer_name: client.name,
      client_id: client.id,
    }));
    setShowClientSelect(false);
  };

  // 显示错误弹窗
  const showError = (title: string, message: string) => {
    setErrorModal({
      isOpen: true,
      title,
      message,
    });
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      showError('未登录', '请先登录后再创建项目');
      return;
    }

    // 表单验证
    if (!formData.name.trim()) {
      showError('验证失败', '请输入项目名称');
      return;
    }
    if (!formData.customer_name.trim()) {
      showError('验证失败', '请选择客户');
      return;
    }

    setLoading(true);

    try {
      // 调用新的项目创建 API
      const project = await apiClient.post<{
        id: string;
        warning?: string;
      }>('/api/projects', {
        name: formData.name.trim(),
        customer_name: formData.customer_name.trim(),
        amount: parseFloat(formData.amount) || 0,
        description: formData.description.trim(),
        is_public: formData.is_public,
        client_id: formData.client_id || undefined,
      });

      // 检查是否有警告信息（里程碑初始化失败）
      if (project.warning) {
        console.warn('项目创建警告:', project.warning);
        showError('创建成功但有警告', `项目创建成功，但里程碑初始化出现问题：${project.warning}`);
      }

      // 跳转到项目详情页
      navigate(`/projects/${project.id}`);
    } catch (error: any) {
      console.error('创建项目失败:', error);
      // 处理后端返回的错误信息
      const errorMessage = error?.message || '创建项目失败，请重试';
      showError('创建失败', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">新建项目</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        {/* 项目名称 */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            项目名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="请输入项目名称"
          />
        </div>

        {/* 客户选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            客户名称 <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 relative">
            <button
              type="button"
              onClick={() => setShowClientSelect(!showClientSelect)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-left focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white hover:bg-gray-50"
            >
              {selectedClient ? (
                <span className="flex items-center">
                  <span className="font-medium">{selectedClient.name}</span>
                  <span className="ml-2 text-gray-400 text-sm">{selectedClient.location}</span>
                </span>
              ) : (
                <span className="text-gray-500">请选择客户...</span>
              )}
            </button>
            
            {showClientSelect && (
              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                {clients.length === 0 ? (
                  <div className="px-4 py-2 text-gray-500">暂无客户，请先添加客户</div>
                ) : (
                  clients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => handleClientSelect(client)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between"
                    >
                      <span className="font-medium">{client.name}</span>
                      <span className="text-gray-400 text-sm">{client.location}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* 项目金额 */}
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            项目金额 (¥)
          </label>
          <input
            type="text"
            id="amount"
            inputMode="decimal"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={formData.amount}
            onChange={(e) => {
              const value = e.target.value;
              // 只允许数字和小数点
              if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                setFormData(prev => ({ ...prev, amount: value }));
              }
            }}
            placeholder="请输入项目金额"
          />
          {formData.amount && parseFloat(formData.amount) > 0 && (
            <p className="mt-1 text-sm text-gray-600">
              大写：<strong className="text-indigo-600">{numberToChinese(parseFloat(formData.amount))}</strong>
            </p>
          )}
        </div>

        {/* 项目描述 */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            项目描述
          </label>
          <textarea
            id="description"
            rows={4}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="请输入项目描述（可选）"
          />
        </div>

        {/* 公开项目选项 */}
        <div className="flex items-center">
          <input
            id="is_public"
            type="checkbox"
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            checked={formData.is_public}
            onChange={(e) => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
          />
          <label htmlFor="is_public" className="ml-2 block text-sm text-gray-900">
            公开项目（对所有用户可见）
          </label>
        </div>

        {/* 模板版本信息 */}
        {templateVersion && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <span className="font-medium">里程碑模板版本：</span>
              {templateVersion.name} (v{templateVersion.version_number})
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {templateVersion.description || '创建项目后将自动根据此模板初始化里程碑阶段和任务'}
            </p>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                创建中...
              </>
            ) : (
              '创建项目'
            )}
          </button>
        </div>
      </form>

      {/* 错误提示弹窗 */}
      <ThemedModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
        title={errorModal.title}
        size="sm"
        footer={
          <ThemedButton
            variant="primary"
            onClick={() => setErrorModal(prev => ({ ...prev, isOpen: false }))}
          >
            知道了
          </ThemedButton>
        }
      >
        <div className="flex items-start gap-4">
          <div
            className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#fef2f2',
            }}
          >
            <span style={{ color: isDark ? '#f87171' : '#ef4444', fontSize: '1.25rem' }}>✕</span>
          </div>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {errorModal.message}
          </p>
        </div>
      </ThemedModal>
    </div>
  );
};

export default ProjectCreate;
