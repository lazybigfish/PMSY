import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { VersionSelector } from '../components/VersionSelector';
import { MilestoneTemplateList } from '../components/MilestoneTemplateList';

// --- Types ---

interface TemplateVersion {
  id: string;
  version_name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface MilestoneTemplate {
  id: string;
  version_id: string;
  name: string;
  description: string;
  phase_order: number;
  tasks?: MilestoneTaskTemplate[];
}

interface MilestoneTaskTemplate {
  id: string;
  milestone_template_id: string;
  name: string;
  description: string;
  is_required: boolean;
  output_documents: OutputDocument[];
}

interface OutputDocument {
  name: string;
  required: boolean;
}

// --- Component ---

export default function MilestoneTemplates() {
  // --- State ---
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null);
  const [milestones, setMilestones] = useState<MilestoneTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  // Modals / Editing State
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Partial<MilestoneTemplate> | null>(null);
  const [editingTask, setEditingTask] = useState<Partial<MilestoneTaskTemplate> | null>(null);
  
  // Version Form State
  const [newVersionForm, setNewVersionForm] = useState({
    version_name: '',
    description: '',
    copyFrom: ''
  });

  // --- Effects ---

  useEffect(() => {
    fetchVersions();
  }, []);

  useEffect(() => {
    if (selectedVersion) {
      fetchMilestones(selectedVersion.id);
    } else {
      setMilestones([]);
    }
  }, [selectedVersion]);

  // --- Data Fetching ---

  const fetchVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('template_versions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setVersions(data || []);
      if (!selectedVersion && data && data.length > 0) {
        const active = data.find((v: TemplateVersion) => v.is_active);
        setSelectedVersion(active || data[0]);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    }
  };

  const activeVersion = versions.find(v => v.is_active);

  const fetchMilestones = async (versionId: string) => {
    try {
      setLoading(true);
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestone_templates')
        .select('*')
        .eq('version_id', versionId)
        .order('phase_order', { ascending: true });

      if (milestonesError) throw milestonesError;
      if (!milestonesData) {
        setMilestones([]);
        return;
      }

      const milestoneIds = milestonesData.map(m => m.id);
      const { data: tasksData, error: tasksError } = await supabase
        .from('milestone_task_templates')
        .select('*')
        .in('milestone_template_id', milestoneIds)
        .order('created_at', { ascending: true });

      if (tasksError) throw tasksError;

      const milestonesWithTasks = milestonesData.map(m => ({
        ...m,
        tasks: tasksData?.filter(t => t.milestone_template_id === m.id) || []
      }));

      setMilestones(milestonesWithTasks);
    } catch (error) {
      console.error('Error fetching milestones:', error);
    } finally {
      setLoading(false);
    }
  };

  // --- Actions ---

  const handleCreateVersion = async () => {
    try {
      setLoading(true);
      const { data: newVersion, error: vError } = await supabase
        .from('template_versions')
        .insert({
          version_name: newVersionForm.version_name,
          description: newVersionForm.description,
          is_active: false
        })
        .select()
        .single();

      if (vError) throw vError;

      if (newVersionForm.copyFrom) {
        await copyMilestones(newVersionForm.copyFrom, newVersion.id);
      }

      await fetchVersions();
      setSelectedVersion(newVersion);
      setShowVersionModal(false);
      setNewVersionForm({ version_name: '', description: '', copyFrom: '' });
    } catch (error) {
      console.error('Error creating version:', error);
      alert('创建版本失败');
    } finally {
      setLoading(false);
    }
  };

  const copyMilestones = async (sourceVersionId: string, targetVersionId: string) => {
    const { data: sourceMilestones } = await supabase
      .from('milestone_templates')
      .select('*')
      .eq('version_id', sourceVersionId);

    if (!sourceMilestones) return;

    for (const sm of sourceMilestones) {
      const { data: newMilestone } = await supabase
        .from('milestone_templates')
        .insert({
          version_id: targetVersionId,
          name: sm.name,
          description: sm.description,
          phase_order: sm.phase_order
        })
        .select()
        .single();

      if (!newMilestone) continue;

      const { data: sourceTasks } = await supabase
        .from('milestone_task_templates')
        .select('*')
        .eq('milestone_template_id', sm.id);

      if (sourceTasks && sourceTasks.length > 0) {
        const newTasks = sourceTasks.map(st => ({
          milestone_template_id: newMilestone.id,
          name: st.name,
          description: st.description,
          is_required: st.is_required,
          output_documents: st.output_documents
        }));
        await supabase.from('milestone_task_templates').insert(newTasks);
      }
    }
  };

  const handleSetActiveVersion = async (version: TemplateVersion) => {
    if (!confirm(`确定要将 ${version.version_name} 设为当前生效版本吗？`)) return;
    
    try {
      setLoading(true);
      await supabase.rpc('set_active_template_version', { target_version_id: version.id });
      await fetchVersions();
    } catch (error) {
      console.error('Error setting active version:', error);
      alert('设置生效版本失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMilestone = () => {
    if (!selectedVersion) return;
    const newOrder = milestones.length > 0 
      ? Math.max(...milestones.map(m => m.phase_order)) + 1 
      : 1;

    setEditingMilestone({
      version_id: selectedVersion.id,
      name: '',
      description: '',
      phase_order: newOrder
    });
  };

  const handleSaveMilestone = async () => {
    if (!editingMilestone || !editingMilestone.name) return;
    
    try {
      if (editingMilestone.id) {
        await supabase
          .from('milestone_templates')
          .update({
            name: editingMilestone.name,
            description: editingMilestone.description
          })
          .eq('id', editingMilestone.id);
      } else {
        await supabase.from('milestone_templates').insert({
          version_id: selectedVersion?.id,
          name: editingMilestone.name,
          description: editingMilestone.description,
          phase_order: editingMilestone.phase_order
        });
      }
      setEditingMilestone(null);
      if (selectedVersion) fetchMilestones(selectedVersion.id);
    } catch (error) {
      console.error('Error saving milestone:', error);
    }
  };

  const handleDeleteMilestone = async (milestone: MilestoneTemplate) => {
    if (!confirm('确定删除此阶段吗？')) return;
    try {
      await supabase.from('milestone_templates').delete().eq('id', milestone.id);
      if (selectedVersion) fetchMilestones(selectedVersion.id);
    } catch (error) {
      console.error('Error deleting milestone:', error);
    }
  };

  const handleMoveMilestone = async (milestone: MilestoneTemplate, direction: 'up' | 'down') => {
    const currentIndex = milestones.findIndex(m => m.id === milestone.id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= milestones.length) return;

    const targetMilestone = milestones[targetIndex];

    try {
      await supabase.from('milestone_templates').update({ phase_order: targetMilestone.phase_order }).eq('id', milestone.id);
      await supabase.from('milestone_templates').update({ phase_order: milestone.phase_order }).eq('id', targetMilestone.id);
      if (selectedVersion) fetchMilestones(selectedVersion.id);
    } catch (error) {
      console.error('Error moving milestone:', error);
    }
  };

  const handleAddTask = (milestone: MilestoneTemplate) => {
    setEditingTask({
      milestone_template_id: milestone.id,
      name: '',
      description: '',
      is_required: true,
      output_documents: []
    });
  };

  const handleSaveTask = async () => {
    if (!editingTask || !editingTask.name || !editingTask.milestone_template_id) return;

    try {
      if (editingTask.id) {
        await supabase
          .from('milestone_task_templates')
          .update({
            name: editingTask.name,
            description: editingTask.description,
            is_required: editingTask.is_required,
            output_documents: editingTask.output_documents
          })
          .eq('id', editingTask.id);
      } else {
        await supabase.from('milestone_task_templates').insert({
          milestone_template_id: editingTask.milestone_template_id,
          name: editingTask.name,
          description: editingTask.description,
          is_required: editingTask.is_required,
          output_documents: editingTask.output_documents
        });
      }
      setEditingTask(null);
      if (selectedVersion) fetchMilestones(selectedVersion.id);
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const handleDeleteTask = async (task: MilestoneTaskTemplate) => {
    if (!confirm('确定删除此任务吗？')) return;
    try {
      await supabase.from('milestone_task_templates').delete().eq('id', task.id);
      if (selectedVersion) fetchMilestones(selectedVersion.id);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const toggleMilestone = (id: string) => {
    const newSet = new Set(expandedMilestones);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedMilestones(newSet);
  };

  const addOutputDocument = () => {
    if (!editingTask) return;
    setEditingTask({
      ...editingTask,
      output_documents: [...(editingTask.output_documents || []), { name: '', required: true }]
    });
  };

  const updateOutputDocument = (index: number, field: keyof OutputDocument, value: any) => {
    if (!editingTask || !editingTask.output_documents) return;
    const newDocs = [...editingTask.output_documents];
    newDocs[index] = { ...newDocs[index], [field]: value };
    setEditingTask({ ...editingTask, output_documents: newDocs });
  };

  const removeOutputDocument = (index: number) => {
    if (!editingTask || !editingTask.output_documents) return;
    const newDocs = [...editingTask.output_documents];
    newDocs.splice(index, 1);
    setEditingTask({ ...editingTask, output_documents: newDocs });
  };

  const handleInitDefaultVersion = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('template_versions')
        .insert({
          version_name: 'V1.0',
          description: 'Initial Version',
          is_active: true
        })
        .select()
        .single();
      
      if (error) throw error;
      await fetchVersions();
      setSelectedVersion(data);
    } catch (error) {
      console.error('Error initializing version:', error);
      alert('初始化版本失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <h3 className="text-lg font-medium text-gray-900 mr-4">里程碑模板管理</h3>
            {activeVersion ? (
              <div className="flex items-center text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                当前生效版本：<span className="font-medium text-gray-900 mx-1">{activeVersion.version_name}</span>
              </div>
            ) : (
              <div className="flex items-center text-sm text-red-500 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                <AlertCircle className="w-4 h-4 mr-2" />
                当前无生效版本
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {versions.length > 0 ? (
              <button 
                onClick={() => setShowVersionModal(true)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                管理版本
              </button>
            ) : (
              <button 
                onClick={handleInitDefaultVersion}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                初始化 V1.0
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-4 gap-6">
        {/* Version Selector */}
        <div className="col-span-1">
          <VersionSelector
            versions={versions}
            selectedVersion={selectedVersion}
            onSelectVersion={setSelectedVersion}
            onCreateVersion={() => setShowVersionModal(true)}
            onSetActiveVersion={handleSetActiveVersion}
          />
        </div>

        {/* Milestone List */}
        <div className="col-span-3">
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">
                {selectedVersion ? `${selectedVersion.version_name} - 阶段模板` : '请选择版本'}
              </h3>
              {selectedVersion && (
                <button
                  onClick={handleAddMilestone}
                  className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  <Plus className="w-4 h-4" />
                  新增阶段
                </button>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : selectedVersion ? (
              <MilestoneTemplateList
                milestones={milestones}
                expandedMilestones={expandedMilestones}
                onToggleExpand={toggleMilestone}
                onEditMilestone={(m) => setEditingMilestone(m)}
                onDeleteMilestone={handleDeleteMilestone}
                onMoveMilestone={handleMoveMilestone}
                onAddTask={handleAddTask}
                onEditTask={(t) => setEditingTask(t)}
                onDeleteTask={handleDeleteTask}
                canMoveUp={(m) => milestones.findIndex(x => x.id === m.id) > 0}
                canMoveDown={(m) => milestones.findIndex(x => x.id === m.id) < milestones.length - 1}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                请先选择一个版本
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Version Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">新建版本</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">版本名称</label>
                <input
                  type="text"
                  value={newVersionForm.version_name}
                  onChange={(e) => setNewVersionForm({ ...newVersionForm, version_name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="如：V2.0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={newVersionForm.description}
                  onChange={(e) => setNewVersionForm({ ...newVersionForm, description: e.target.value })}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">复制自</label>
                <select
                  value={newVersionForm.copyFrom}
                  onChange={(e) => setNewVersionForm({ ...newVersionForm, copyFrom: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">不复制（空白版本）</option>
                  {versions.map(v => (
                    <option key={v.id} value={v.id}>{v.version_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowVersionModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleCreateVersion}
                disabled={!newVersionForm.version_name || loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Milestone Edit Modal */}
      {editingMilestone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingMilestone.id ? '编辑阶段' : '新增阶段'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">阶段名称</label>
                <input
                  type="text"
                  value={editingMilestone.name || ''}
                  onChange={(e) => setEditingMilestone({ ...editingMilestone, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={editingMilestone.description || ''}
                  onChange={(e) => setEditingMilestone({ ...editingMilestone, description: e.target.value })}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingMilestone(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveMilestone}
                disabled={!editingMilestone.name}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingTask.id ? '编辑任务' : '新增任务'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">任务名称</label>
                <input
                  type="text"
                  value={editingTask.name || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={editingTask.description || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_required"
                  checked={editingTask.is_required}
                  onChange={(e) => setEditingTask({ ...editingTask, is_required: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="is_required" className="text-sm text-gray-700">必须完成</label>
              </div>
              
              {/* Output Documents */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">输出文档</label>
                  <button
                    onClick={addOutputDocument}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    + 添加文档
                  </button>
                </div>
                <div className="space-y-2">
                  {(editingTask.output_documents || []).map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={doc.name}
                        onChange={(e) => updateOutputDocument(idx, 'name', e.target.value)}
                        placeholder="文档名称"
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      />
                      <label className="flex items-center gap-1 text-sm">
                        <input
                          type="checkbox"
                          checked={doc.required}
                          onChange={(e) => updateOutputDocument(idx, 'required', e.target.checked)}
                          className="w-4 h-4"
                        />
                        必填
                      </label>
                      <button
                        onClick={() => removeOutputDocument(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleSaveTask}
                disabled={!editingTask.name}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
