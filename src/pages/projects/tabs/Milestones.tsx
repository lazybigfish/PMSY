import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Flag, Plus, Search, Download, Archive } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { MilestoneSidebar } from '../components/MilestoneSidebar';
import { MilestoneTaskList } from '../components/MilestoneTaskList';
import JSZip from 'jszip';

interface Milestone {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  start_date: string;
  end_date: string;
  phase_order: number;
  progress: number;
  is_custom?: boolean;
}

interface MilestoneTask {
  id: string;
  milestone_id: string;
  name: string;
  description: string;
  is_required: boolean;
  is_completed: boolean;
  completed_at: string;
  completed_by: string;
  output_documents: { name: string; url: string; uploaded_at?: string; uploaded_by?: string }[];
  is_custom?: boolean;
}

interface MilestonesProps {
  projectId: string;
}

export default function Milestones({ projectId }: MilestonesProps) {
  const { user } = useAuth();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksByMilestone, setTasksByMilestone] = useState<Record<string, MilestoneTask[]>>({});
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');
  const [filterRequired, setFilterRequired] = useState<'all' | 'required' | 'optional'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showDocModal, setShowDocModal] = useState(false);
  const [currentTask, setCurrentTask] = useState<MilestoneTask | null>(null);
  const [docForm, setDocForm] = useState({ name: '', url: '' });
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newMilestoneForm, setNewMilestoneForm] = useState({ 
    name: '', 
    description: '', 
    insertPosition: 'after', 
    targetMilestoneId: '' 
  });
  const [newTaskForm, setNewTaskForm] = useState({ 
    name: '', 
    description: '', 
    is_required: false,
    output_documents: [] as { name: string; required: boolean }[]
  });

  useEffect(() => {
    if (projectId) {
      fetchMilestones();
    }
  }, [projectId]);

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*, milestone_tasks(id, is_completed)')
        .eq('project_id', projectId)
        .order('phase_order', { ascending: true });

      if (error) throw error;
      
      const milestonesData = (data || []).map((m: { milestone_tasks?: { is_completed: boolean }[] } & Milestone) => {
        const tasks = m.milestone_tasks || [];
        const total = tasks.length;
        const completed = tasks.filter((t) => t.is_completed).length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { ...m, progress };
      });

      setMilestones(milestonesData);
      
      // Auto-select first milestone
      const inProgress = milestonesData.find((m: Milestone) => m.status === 'in_progress');
      const firstPending = milestonesData.find((m: Milestone) => m.status === 'pending');
      const selected = inProgress || firstPending || milestonesData[0];
      if (selected) {
        setSelectedMilestoneId(selected.id);
        fetchMilestoneTasks(selected.id);
      }
    } catch (error) {
      console.error('Error fetching milestones:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMilestoneTasks = async (milestoneId: string) => {
    const { data } = await supabase
      .from('milestone_tasks')
      .select('*')
      .eq('milestone_id', milestoneId)
      .order('id', { ascending: true });

    setTasksByMilestone(prev => ({
      ...prev,
      [milestoneId]: data || []
    }));
  };

  const initMilestones = async () => {
    if (!confirm('确定要根据模板初始化里程碑吗？')) return;
    // Simplified initialization
    alert('初始化功能需要配置模板');
  };

  const updateMilestoneStatus = async (id: string, status: string) => {
    if (status === 'completed' && !confirm('确定要将当前阶段标记为已完成吗？')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('project_milestones')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      fetchMilestones();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('状态更新失败');
    }
  };

  const toggleTaskCompleted = async (task: MilestoneTask) => {
    try {
      const newStatus = !task.is_completed;
      const updates = {
        is_completed: newStatus,
        completed_at: newStatus ? new Date().toISOString() : null,
        completed_by: newStatus ? user?.id : null
      };

      const { error } = await supabase
        .from('milestone_tasks')
        .update(updates)
        .eq('id', task.id);

      if (error) {
        console.error('Error updating task:', error);
        alert('更新任务状态失败: ' + error.message);
        return;
      }

      fetchMilestoneTasks(task.milestone_id);
      fetchMilestones();
    } catch (error: any) {
      console.error('Error toggling task:', error);
      alert('更新任务状态失败: ' + (error?.message || '未知错误'));
    }
  };

  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);

  const handleAddDocClick = (task: MilestoneTask) => {
    // 触发文件选择
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await handleAttachmentUpload(task, file);
      }
    };
    input.click();
  };

  const handleAttachmentUpload = async (task: MilestoneTask, file: File) => {
    if (!file) return;
    
    setUploadingTaskId(task.id);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${task.id}_${Date.now()}.${fileExt}`;
      const filePath = `milestone-attachments/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-documents')
        .getPublicUrl(filePath);

      // Add as output document
      const newDoc = { 
        name: file.name, 
        url: publicUrl, 
        uploaded_at: new Date().toISOString(),
        uploaded_by: user?.id 
      };
      const docs = [...(task.output_documents || []), newDoc];
      
      const { error: updateError } = await supabase
        .from('milestone_tasks')
        .update({ output_documents: docs })
        .eq('id', task.id);

      if (updateError) throw updateError;

      fetchMilestoneTasks(task.milestone_id);
    } catch (error) {
      console.error('Error uploading attachment:', error);
      alert('上传附件失败');
    } finally {
      setUploadingTaskId(null);
    }
  };

  const removeOutputDocument = async (task: MilestoneTask, docIndex: number) => {
    if (!confirm('确定要删除此文档吗？')) return;
    
    const docs = [...(task.output_documents || [])];
    docs.splice(docIndex, 1);
    
    await supabase
      .from('milestone_tasks')
      .update({ output_documents: docs })
      .eq('id', task.id);

    fetchMilestoneTasks(task.milestone_id);
  };

  const handleDeleteTask = async (task: MilestoneTask) => {
    if (!confirm(`确定要删除任务"${task.name}"吗？`)) return;

    await supabase.from('milestone_tasks').delete().eq('id', task.id);
    fetchMilestoneTasks(task.milestone_id);
    fetchMilestones();
  };

  const handleDeleteMilestone = async (e: React.MouseEvent, milestone: Milestone) => {
    e.stopPropagation();
    if (!confirm(`确定要删除阶段"${milestone.name}"吗？`)) return;

    await supabase.from('project_milestones').delete().eq('id', milestone.id);
    fetchMilestones();
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneForm.name) return;

    let newPhaseOrder: number;

    if (newMilestoneForm.targetMilestoneId) {
      const targetMilestone = milestones.find(m => m.id === newMilestoneForm.targetMilestoneId);
      if (targetMilestone) {
        if (newMilestoneForm.insertPosition === 'before') {
          newPhaseOrder = targetMilestone.phase_order;
        } else {
          newPhaseOrder = targetMilestone.phase_order + 1;
        }
      } else {
        const maxPhaseOrder = Math.max(...milestones.map(m => m.phase_order), 0);
        newPhaseOrder = maxPhaseOrder + 1;
      }
    } else {
      const maxPhaseOrder = Math.max(...milestones.map(m => m.phase_order), 0);
      newPhaseOrder = maxPhaseOrder + 1;
    }

    // 插入新阶段
    const { error: insertError } = await supabase
      .from('project_milestones')
      .insert({
        project_id: projectId,
        name: newMilestoneForm.name,
        description: newMilestoneForm.description,
        phase_order: newPhaseOrder,
        status: 'pending',
        is_custom: true
      });

    if (insertError) {
      console.error('Error inserting milestone:', insertError);
      alert('添加阶段失败');
      return;
    }

    // 重新排序所有阶段的 phase_order
    await reorderMilestones();

    fetchMilestones();
    setShowAddMilestoneModal(false);
    setNewMilestoneForm({ name: '', description: '', insertPosition: 'after', targetMilestoneId: '' });
  };

  const reorderMilestones = async () => {
    const { data: allMilestones } = await supabase
      .from('project_milestones')
      .select('id, phase_order')
      .eq('project_id', projectId)
      .order('phase_order', { ascending: true });

    if (allMilestones && allMilestones.length > 0) {
      // 使用 Promise.all 并行更新
      const updatePromises = allMilestones.map((milestone, index) =>
        supabase
          .from('project_milestones')
          .update({ phase_order: index + 1 })
          .eq('id', milestone.id)
      );
      await Promise.all(updatePromises);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskForm.name || !selectedMilestoneId) return;

    await supabase.from('milestone_tasks').insert({
      milestone_id: selectedMilestoneId,
      name: newTaskForm.name,
      description: newTaskForm.description,
      is_required: newTaskForm.is_required,
      is_completed: false,
      is_custom: true,
      output_documents: newTaskForm.output_documents
    });

    fetchMilestoneTasks(selectedMilestoneId);
    fetchMilestones();
    setShowAddTaskModal(false);
    setNewTaskForm({ name: '', description: '', is_required: false, output_documents: [] });
  };

  const getFilteredTasks = (milestoneId: string) => {
    const tasks = tasksByMilestone[milestoneId] || [];
    return tasks.filter(task => {
      const matchesSearch = task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'completed' && task.is_completed) ||
                          (filterStatus === 'pending' && !task.is_completed);
      const matchesRequired = filterRequired === 'all' ||
                            (filterRequired === 'required' && task.is_required) ||
                            (filterRequired === 'optional' && !task.is_required);
      return matchesSearch && matchesStatus && matchesRequired;
    });
  };

  // 下载单个文件
  const downloadFile = async (url: string, filename: string): Promise<Blob> => {
    const response = await fetch(url);
    return await response.blob();
  };

  // 打包下载当前阶段的文档
  const downloadMilestoneDocs = async (milestone: Milestone) => {
    const tasks = tasksByMilestone[milestone.id] || [];
    const docs: { name: string; url: string; taskName: string }[] = [];

    tasks.forEach(task => {
      if (task.output_documents) {
        task.output_documents.forEach(doc => {
          if (doc.url) {
            docs.push({
              name: doc.name,
              url: doc.url,
              taskName: task.name
            });
          }
        });
      }
    });

    if (docs.length === 0) {
      alert('该阶段没有可下载的附件');
      return;
    }

    try {
      const zip = new JSZip();
      const folder = zip.folder(milestone.name) || zip;

      // 按任务分组创建子文件夹
      const taskFolders: { [key: string]: JSZip | null } = {};

      for (const doc of docs) {
        try {
          const blob = await downloadFile(doc.url, doc.name);
          // 获取文件扩展名
          const urlParts = doc.url.split('.');
          const ext = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : '';
          const filename = ext ? `${doc.name}.${ext}` : doc.name;

          // 创建任务子文件夹
          if (!taskFolders[doc.taskName]) {
            taskFolders[doc.taskName] = folder.folder(doc.taskName);
          }

          const targetFolder = taskFolders[doc.taskName] || folder;
          targetFolder.file(filename, blob);
        } catch (error) {
          console.error(`Error downloading ${doc.name}:`, error);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${milestone.name}_附件.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error creating zip:', error);
      alert('打包下载失败');
    }
  };

  // 打包下载所有阶段的文档
  const downloadAllDocs = async () => {
    const allDocs: { name: string; url: string; taskName: string; milestoneName: string }[] = [];

    milestones.forEach(milestone => {
      const tasks = tasksByMilestone[milestone.id] || [];
      tasks.forEach(task => {
        if (task.output_documents) {
          task.output_documents.forEach(doc => {
            if (doc.url) {
              allDocs.push({
                name: doc.name,
                url: doc.url,
                taskName: task.name,
                milestoneName: milestone.name
              });
            }
          });
        }
      });
    });

    if (allDocs.length === 0) {
      alert('没有可下载的附件');
      return;
    }

    try {
      const zip = new JSZip();

      for (const doc of allDocs) {
        try {
          const blob = await downloadFile(doc.url, doc.name);
          const urlParts = doc.url.split('.');
          const ext = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : '';
          const filename = ext ? `${doc.name}.${ext}` : doc.name;

          // 创建阶段文件夹
          const milestoneFolder = zip.folder(doc.milestoneName) || zip;
          // 创建任务子文件夹
          const taskFolder = milestoneFolder.folder(doc.taskName) || milestoneFolder;
          taskFolder.file(filename, blob);
        } catch (error) {
          console.error(`Error downloading ${doc.name}:`, error);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `项目所有附件.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error creating zip:', error);
      alert('打包下载失败');
    }
  };

  const selectedMilestone = milestones.find(m => m.id === selectedMilestoneId);
  const filteredTasks = selectedMilestoneId ? getFilteredTasks(selectedMilestoneId) : [];

  if (loading) return <div className="p-4 text-center">加载中...</div>;

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <MilestoneSidebar
        milestones={milestones}
        selectedMilestoneId={selectedMilestoneId}
        onSelectMilestone={(m) => {
          setSelectedMilestoneId(m.id);
          fetchMilestoneTasks(m.id);
        }}
        onUpdateStatus={updateMilestoneStatus}
        onDeleteMilestone={handleDeleteMilestone}
        onAddMilestone={() => setShowAddMilestoneModal(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedMilestone ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedMilestone.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    进度: {selectedMilestone.progress}% | 任务: {filteredTasks.filter(t => t.is_completed).length}/{filteredTasks.length}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadMilestoneDocs(selectedMilestone)}
                    className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                    title="打包下载本阶段所有附件"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    阶段下载
                  </button>
                  <select
                    value={selectedMilestone.status}
                    onChange={(e) => updateMilestoneStatus(selectedMilestone.id, e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="pending">未开始</option>
                    <option value="in_progress">进行中</option>
                    <option value="completed">已完成</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索任务..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'all' | 'completed' | 'pending')}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="all">全部状态</option>
                  <option value="completed">已完成</option>
                  <option value="pending">未完成</option>
                </select>
                <select
                  value={filterRequired}
                  onChange={(e) => setFilterRequired(e.target.value as 'all' | 'required' | 'optional')}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="all">全部类型</option>
                  <option value="required">必选</option>
                  <option value="optional">可选</option>
                </select>
                <button
                  onClick={() => setShowAddTaskModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  新增任务
                </button>
                <button
                  onClick={downloadAllDocs}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                  title="打包下载所有阶段的所有附件"
                >
                  <Archive className="h-4 w-4 mr-1" />
                  完整打包下载
                </button>
              </div>
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto p-4">
              <MilestoneTaskList
                tasks={filteredTasks}
                onToggleTask={toggleTaskCompleted}
                onAddDoc={handleAddDocClick}
                onRemoveDoc={removeOutputDocument}
                onDeleteTask={handleDeleteTask}
                uploadingTaskId={uploadingTaskId}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Flag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>请选择左侧阶段查看任务详情</p>
              {milestones.length === 0 && (
                <button
                  onClick={initMilestones}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  初始化标准里程碑
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Milestone Modal */}
      {showAddMilestoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">新增阶段</h3>
            <form onSubmit={handleAddMilestone} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">阶段名称</label>
                <input
                  type="text"
                  required
                  value={newMilestoneForm.name}
                  onChange={(e) => setNewMilestoneForm({ ...newMilestoneForm, name: e.target.value })}
                  className="mt-1 block w-full border rounded-md py-2 px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">描述</label>
                <textarea
                  value={newMilestoneForm.description}
                  onChange={(e) => setNewMilestoneForm({ ...newMilestoneForm, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border rounded-md py-2 px-3"
                />
              </div>
              {milestones.length > 0 && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">插入位置</label>
                    <select
                      value={newMilestoneForm.targetMilestoneId}
                      onChange={(e) => setNewMilestoneForm({ ...newMilestoneForm, targetMilestoneId: e.target.value })}
                      className="block w-full border rounded-md py-2 px-3"
                    >
                      <option value="">-- 选择参考阶段 --</option>
                      {milestones.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} (顺序: {m.phase_order})
                        </option>
                      ))}
                    </select>
                  </div>
                  {newMilestoneForm.targetMilestoneId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">放置位置</label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="insertPosition"
                            value="before"
                            checked={newMilestoneForm.insertPosition === 'before'}
                            onChange={(e) => setNewMilestoneForm({ ...newMilestoneForm, insertPosition: e.target.value })}
                            className="h-4 w-4 text-indigo-600"
                          />
                          <span className="ml-2 text-sm">在选定阶段之前</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="insertPosition"
                            value="after"
                            checked={newMilestoneForm.insertPosition === 'after'}
                            onChange={(e) => setNewMilestoneForm({ ...newMilestoneForm, insertPosition: e.target.value })}
                            className="h-4 w-4 text-indigo-600"
                          />
                          <span className="ml-2 text-sm">在选定阶段之后</span>
                        </label>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddMilestoneModal(false)}
                  className="px-4 py-2 border rounded-md text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm"
                >
                  确认添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">新增任务</h3>
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">任务名称</label>
                <input
                  type="text"
                  required
                  value={newTaskForm.name}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, name: e.target.value })}
                  className="mt-1 block w-full border rounded-md py-2 px-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">描述</label>
                <textarea
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border rounded-md py-2 px-3"
                />
              </div>
              <div className="flex items-center">
                <input
                  id="is_required"
                  type="checkbox"
                  checked={newTaskForm.is_required}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, is_required: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                <label htmlFor="is_required" className="ml-2 text-sm">必须完成</label>
              </div>

              {/* 输出物编辑 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">输出物</label>
                <div className="space-y-2">
                  {newTaskForm.output_documents.map((doc, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={doc.name}
                        onChange={(e) => {
                          const newDocs = [...newTaskForm.output_documents];
                          newDocs[index].name = e.target.value;
                          setNewTaskForm({ ...newTaskForm, output_documents: newDocs });
                        }}
                        placeholder="文档名称"
                        className="flex-1 border rounded-md py-1 px-2 text-sm"
                      />
                      <label className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={doc.required}
                          onChange={(e) => {
                            const newDocs = [...newTaskForm.output_documents];
                            newDocs[index].required = e.target.checked;
                            setNewTaskForm({ ...newTaskForm, output_documents: newDocs });
                          }}
                          className="h-4 w-4 rounded mr-1"
                        />
                        必需
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newDocs = newTaskForm.output_documents.filter((_, i) => i !== index);
                          setNewTaskForm({ ...newTaskForm, output_documents: newDocs });
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setNewTaskForm({
                        ...newTaskForm,
                        output_documents: [...newTaskForm.output_documents, { name: '', required: true }]
                      });
                    }}
                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                  >
                    + 添加输出物
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="px-4 py-2 border rounded-md text-sm"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm"
                >
                  确认添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
