import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Trash2, Edit2, FileText } from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  config: string; // Stored as JSONB in DB, but we'll edit as string for simplicity
  is_active: boolean;
  created_at: string;
}

export default function ReportTemplates() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Partial<ReportTemplate>>({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个模板吗？')) return;

    try {
      const { error } = await supabase
        .from('report_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTemplates(templates.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const configJson = currentTemplate.config ? JSON.parse(currentTemplate.config) : {};
      
      if (isEditing && currentTemplate.id) {
        const { error } = await supabase
          .from('report_templates')
          .update({
            name: currentTemplate.name,
            config: configJson,
            is_active: currentTemplate.is_active
          })
          .eq('id', currentTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('report_templates')
          .insert([{
            name: currentTemplate.name,
            config: configJson,
            is_active: currentTemplate.is_active !== false
          }]);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      fetchTemplates();
      setCurrentTemplate({});
    } catch (error) {
      console.error('Error saving template:', error);
      alert('保存失败，请检查配置是否为有效的 JSON 格式');
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentTemplate({ 
      is_active: true,
      config: JSON.stringify({
        sections: [
          { id: "overview", title: "项目概况", type: "text" },
          { id: "completed_work", title: "已完成工作", type: "list" },
          { id: "plan", title: "下周计划", type: "list" },
          { id: "risks", title: "风险与问题", type: "list" }
        ]
      }, null, 2)
    });
    setIsModalOpen(true);
  };

  const openEditModal = (template: ReportTemplate) => {
    setIsEditing(true);
    setCurrentTemplate({
      ...template,
      config: JSON.stringify(template.config, null, 2)
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">报告模板管理</h3>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 text-white px-3 py-2 rounded-md text-sm flex items-center hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          新增模板
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">加载中...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-indigo-100 p-2 rounded-lg mr-4">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {template.is_active ? '启用' : '禁用'}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => openEditModal(template)}
                  className="p-2 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-gray-100"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          
          {templates.length === 0 && (
            <div className="text-center py-8 text-gray-500 border border-dashed border-gray-300 rounded-lg">
              暂无模板
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {isEditing ? '编辑模板' : '新增模板'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模板名称</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={currentTemplate.name || ''}
                  onChange={e => setCurrentTemplate({...currentTemplate, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">配置 (JSON)</label>
                <textarea
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  rows={8}
                  value={currentTemplate.config || ''}
                  onChange={e => setCurrentTemplate({...currentTemplate, config: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1">请输入有效的 JSON 格式配置。</p>
              </div>

              <div className="flex items-center">
                <input
                  id="is_active"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  checked={currentTemplate.is_active}
                  onChange={e => setCurrentTemplate({...currentTemplate, is_active: e.target.checked})}
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  启用此模板
                </label>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
