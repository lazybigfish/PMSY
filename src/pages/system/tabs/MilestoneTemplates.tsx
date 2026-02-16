import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
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
  const [showVersionListModal, setShowVersionListModal] = useState(false);
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
      const { data, error } = await api.db
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
      const { data: milestonesData, error: milestonesError } = await api.db
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
      const { data: tasksData, error: tasksError } = await api.db
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
      const { data: newVersionData, error: vError } = await api.db
        .from('template_versions')
        .insert({
          version_name: newVersionForm.version_name,
          description: newVersionForm.description,
          is_active: false
        })
        .select();

      if (vError) throw vError;

      const newVersion = newVersionData?.[0];

      if (newVersionForm.copyFrom && newVersion) {
        await copyMilestones(newVersionForm.copyFrom, newVersion.id);
      }

      // 先刷新版本列表
      await fetchVersions();
      
      // 然后获取刚创建的完整版本数据（包含复制的里程碑）
      if (newVersion) {
        // 设置选中的版本，并触发里程碑数据加载
        setSelectedVersion(newVersion);
        // 立即加载该版本的里程碑数据
        await fetchMilestones(newVersion.id);
      }
      
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
    const { data: sourceMilestones } = await api.db
      .from('milestone_templates')
      .select('*')
      .eq('version_id', sourceVersionId);

    if (!sourceMilestones) return;

    for (const sm of sourceMilestones) {
      const { data: newMilestoneData } = await api.db
        .from('milestone_templates')
        .insert({
          version_id: targetVersionId,
          name: sm.name,
          description: sm.description,
          phase_order: sm.phase_order
        });

      const newMilestone = newMilestoneData?.[0];

      if (!newMilestone) continue;

      const { data: sourceTasks } = await api.db
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
        await api.db.from('milestone_task_templates').insert(newTasks);
      }
    }
  };

  const handleSetActiveVersion = async (version: TemplateVersion) => {
    if (!confirm(`确定要将 "${version.version_name}" 设为当前生效版本吗？\n\n注意：这将影响后续新建的项目，已有项目不受影响。`)) return;

    try {
      setLoading(true);
      await api.db.rpc('set_active_template_version', { target_version_id: version.id });
      await fetchVersions();
      // 如果当前选中的版本被激活，刷新选中状态
      if (selectedVersion?.id === version.id) {
        const updatedVersion = versions.find(v => v.id === version.id);
        if (updatedVersion) {
          setSelectedVersion({ ...updatedVersion, is_active: true });
        }
      }
      alert(`"${version.version_name}" 已设为生效版本`);
    } catch (error) {
      console.error('Error setting active version:', error);
      alert('设置生效版本失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVersion = async (version: TemplateVersion) => {
    if (version.is_active) {
      alert('不能删除当前生效的版本，请先激活其他版本后再删除');
      return;
    }

    if (!confirm(`确定要删除版本 "${version.version_name}" 吗？\n\n警告：此操作将删除该版本下的所有里程碑模板和任务，且无法恢复！`)) return;

    try {
      setLoading(true);
      
      // 1. 删除该版本下的所有任务
      const { data: milestones } = await api.db
        .from('milestone_templates')
        .select('id')
        .eq('version_id', version.id);
      
      if (milestones && milestones.length > 0) {
        const milestoneIds = milestones.map(m => m.id);
        await api.db
          .from('milestone_task_templates')
          .delete()
          .in('milestone_template_id', milestoneIds);
      }

      // 2. 删除该版本下的所有里程碑
      await api.db
        .from('milestone_templates')
        .delete()
        .eq('version_id', version.id);

      // 3. 删除版本
      await api.db
        .from('template_versions')
        .delete()
        .eq('id', version.id);

      // 4. 刷新数据
      await fetchVersions();
      
      // 如果删除的是当前选中的版本，清空选中
      if (selectedVersion?.id === version.id) {
        setSelectedVersion(null);
        setMilestones([]);
      }

      alert(`版本 "${version.version_name}" 已删除`);
    } catch (error) {
      console.error('Error deleting version:', error);
      alert('删除版本失败');
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
        await api.db
          .from('milestone_templates')
          .update({
            name: editingMilestone.name,
            description: editingMilestone.description
          })
          .eq('id', editingMilestone.id);
      } else {
        await api.db.from('milestone_templates').insert({
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
      await api.db.from('milestone_templates').delete().eq('id', milestone.id);
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
      await api.db.from('milestone_templates').update({ phase_order: targetMilestone.phase_order }).eq('id', milestone.id);
      await api.db.from('milestone_templates').update({ phase_order: milestone.phase_order }).eq('id', targetMilestone.id);
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
        await api.db
          .from('milestone_task_templates')
          .update({
            name: editingTask.name,
            description: editingTask.description,
            is_required: editingTask.is_required,
            output_documents: editingTask.output_documents
          })
          .eq('id', editingTask.id);
      } else {
        await api.db.from('milestone_task_templates').insert({
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
      await api.db.from('milestone_task_templates').delete().eq('id', task.id);
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

      // 1. 创建 V1.0 版本
      const { error: versionError } = await api.db
        .from('template_versions')
        .insert({
          version_name: 'V1.0',
          description: '系统初始版本',
          is_active: true
        });

      if (versionError) throw versionError;

      // 查询刚创建的版本
      const { data: versionsData, error: fetchVersionError } = await api.db
        .from('template_versions')
        .select('*')
        .eq('version_name', 'V1.0')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchVersionError) throw fetchVersionError;
      if (!versionsData || versionsData.length === 0) throw new Error('创建版本失败');

      const versionData = versionsData[0];
      const versionId = versionData.id;

      // 2. 创建 7 个默认里程碑阶段
      const defaultMilestones = [
        { name: '进场前阶段', phase_order: 1 },
        { name: '启动阶段', phase_order: 2 },
        { name: '实施阶段', phase_order: 3 },
        { name: '初验阶段', phase_order: 4 },
        { name: '试运行阶段', phase_order: 5 },
        { name: '终验阶段', phase_order: 6 },
        { name: '运维阶段', phase_order: 7 }
      ];

      const { error: milestonesError } = await api.db
        .from('milestone_templates')
        .insert(
          defaultMilestones.map(m => ({
            version_id: versionId,
            name: m.name,
            phase_order: m.phase_order
          }))
        );

      if (milestonesError) throw milestonesError;

      // 查询刚创建的里程碑
      const { data: milestonesData, error: fetchMilestonesError } = await api.db
        .from('milestone_templates')
        .select('*')
        .eq('version_id', versionId)
        .order('phase_order', { ascending: true });

      if (fetchMilestonesError) throw fetchMilestonesError;
      if (!milestonesData || milestonesData.length === 0) throw new Error('创建里程碑模板失败');

      // 3. 创建默认任务模板
      const defaultTasks: Record<string, Array<{ name: string; description: string; is_required: boolean; output_documents: any }>> = {
        '进场前阶段': [
          { name: '获取基础材料', description: '收集项目可研文件、项目合同', is_required: true, output_documents: [{ name: '可研文件', required: true }, { name: '项目合同', required: true }] },
          { name: '明确干系人', description: '梳理甲方负责人及联系人，输出《项目干系人清单》', is_required: true, output_documents: [{ name: '项目干系人清单', required: true }] },
          { name: '组建项目团队', description: '根据建设方向（自研/外采）明确团队成员，输出《项目团队成员表》', is_required: true, output_documents: [{ name: '项目团队成员表', required: true }] },
          { name: '风险与预算分析', description: '基于可研和合同，输出《项目风险清单》和《项目预算规划表》', is_required: true, output_documents: [{ name: '项目风险清单', required: true }, { name: '项目预算规划表', required: true }] },
          { name: '召开内部启动会', description: '整合前期材料，形成会议纪要', is_required: true, output_documents: [{ name: '内部启动会会议纪要', required: true }] }
        ],
        '启动阶段': [
          { name: '编制基础文档', description: '输出《项目经理授权函》《开工报审表》', is_required: true, output_documents: [{ name: '项目经理授权函', required: true }, { name: '开工报审表', required: true }] },
          { name: '拆解建设内容', description: '形成《项目实施功能清单》和《项目实施方案》', is_required: true, output_documents: [{ name: '项目实施功能清单', required: true }, { name: '项目实施方案', required: true }] },
          { name: '制定进度计划', description: '输出《项目实施计划表》', is_required: true, output_documents: [{ name: '项目实施计划表', required: true }] },
          { name: '召开项目启动会', description: '明确议程、参会人，最终输出《开工令》和《会议纪要》', is_required: true, output_documents: [{ name: '开工令', required: true }, { name: '项目启动会会议纪要', required: true }] },
          { name: '筹备服务器资源', description: '申请并确认资源，输出《服务器资源清单》', is_required: true, output_documents: [{ name: '服务器资源清单', required: true }] },
          { name: '供应商/硬件下单', description: '根据功能清单签订合同', is_required: false, output_documents: [{ name: '采购合同', required: false }] }
        ],
        '实施阶段': [
          { name: '需求调研', description: '输出全套设计文档（需求规格、数据库设计、概要/详细设计说明书）', is_required: true, output_documents: [{ name: '需求规格说明书', required: true }, { name: '数据库设计说明书', required: true }, { name: '概要设计说明书', required: true }, { name: '详细设计说明书', required: true }] },
          { name: '系统部署', description: '在已申请服务器上部署系统，更新《服务器资源清单》', is_required: true, output_documents: [{ name: '系统部署文档', required: true }, { name: '服务器资源清单（更新）', required: true }] },
          { name: '第三方测评', description: '开展软件测试、三级等保测评、商用密码测评（均需提前三个月筹备），输出对应报告', is_required: true, output_documents: [{ name: '软件测试报告', required: true }, { name: '三级等保测评报告', required: true }, { name: '商用密码测评报告', required: true }] },
          { name: '培训与自查', description: '组织用户培训并记录；项目组进行功能点自查，输出《功能点验表》', is_required: true, output_documents: [{ name: '用户培训记录', required: true }, { name: '功能点验表', required: true }] },
          { name: '监理核查', description: '由监理方对功能进行核验', is_required: true, output_documents: [{ name: '监理核查报告', required: true }] }
        ],
        '初验阶段': [
          { name: '整理验收文档', description: '编制完整的《文档目录》', is_required: true, output_documents: [{ name: '文档目录', required: true }] },
          { name: '筹备并召开初验会', description: '提交初验申请，形成《初步验收报告》', is_required: true, output_documents: [{ name: '初验申请', required: true }, { name: '初步验收报告', required: true }] },
          { name: '整改专家意见', description: '针对问题输出《遗留问题整改报告》', is_required: true, output_documents: [{ name: '遗留问题整改报告', required: true }] },
          { name: '上线试运行', description: '提交《试运行申请》，系统进入试运行期', is_required: true, output_documents: [{ name: '试运行申请', required: true }] }
        ],
        '试运行阶段': [
          { name: '试运行保障', description: '持续监控并记录运行情况', is_required: true, output_documents: [{ name: '试运行记录', required: true }] },
          { name: '项目结算与决算', description: '依次输出《结算报告》和《决算报告》', is_required: true, output_documents: [{ name: '结算报告', required: true }, { name: '决算报告', required: true }] }
        ],
        '终验阶段': [
          { name: '试运行总结', description: '输出《试运行总结报告》', is_required: true, output_documents: [{ name: '试运行总结报告', required: true }] },
          { name: '终验筹备与召开', description: '提交终验申请，形成《终验报告》', is_required: true, output_documents: [{ name: '终验申请', required: true }, { name: '终验报告', required: true }] },
          { name: '终验整改', description: '再次整改专家意见，更新《遗留问题整改报告》', is_required: true, output_documents: [{ name: '遗留问题整改报告（更新）', required: true }] }
        ],
        '运维阶段': [
          { name: '项目移交', description: '整理全部过程材料，输出《移交清单》，正式移交运维', is_required: true, output_documents: [{ name: '移交清单', required: true }, { name: '项目过程材料归档', required: true }] }
        ]
      };

      // 为每个里程碑创建任务
      for (const milestone of milestonesData) {
        const tasks = defaultTasks[milestone.name];
        if (tasks && tasks.length > 0) {
          const { error: tasksError } = await api.db
            .from('milestone_task_templates')
            .insert(
              tasks.map(task => ({
                milestone_template_id: milestone.id,
                name: task.name,
                description: task.description,
                is_required: task.is_required,
                output_documents: task.output_documents
              }))
            );

          if (tasksError) {
            console.error(`为 ${milestone.name} 创建任务失败:`, tasksError);
          }
        }
      }

      // 刷新数据
      await fetchVersions();
      setSelectedVersion(versionData);
      await fetchMilestones(versionId);

      alert('初始化成功！已创建 V1.0 版本及默认里程碑模板');
    } catch (error) {
      console.error('Error initializing version:', error);
      alert('初始化版本失败: ' + (error instanceof Error ? error.message : '未知错误'));
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
              <>
                <button 
                  onClick={() => setShowVersionListModal(true)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300"
                >
                  版本列表 ({versions.length})
                </button>
                <button 
                  onClick={() => setShowVersionModal(true)}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新建版本
                </button>
              </>
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

      {/* Version List Modal */}
      {showVersionListModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-dark-900/60 backdrop-blur-sm" onClick={() => setShowVersionListModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">版本管理</h3>
              <button
                onClick={() => setShowVersionListModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`border rounded-lg p-4 ${
                    version.is_active ? 'border-green-500 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {version.is_active && (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      )}
                      <div>
                        <h4 className="font-medium text-gray-900">{version.version_name}</h4>
                        <p className="text-sm text-gray-500">{version.description || '无描述'}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          创建于: {new Date(version.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!version.is_active && (
                        <>
                          <button
                            onClick={() => {
                              handleSetActiveVersion(version);
                              setShowVersionListModal(false);
                            }}
                            className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200"
                          >
                            设为生效
                          </button>
                          <button
                            onClick={() => handleDeleteVersion(version)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            title="删除版本"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {version.is_active && (
                        <span className="px-3 py-1.5 text-sm text-green-700 bg-green-100 rounded-lg">
                          当前生效
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowVersionListModal(false);
                  setShowVersionModal(true);
                }}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                新建版本
              </button>
              <button
                onClick={() => setShowVersionListModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-dark-900/60 backdrop-blur-sm" onClick={() => setShowVersionModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-dark-900/60 backdrop-blur-sm" onClick={() => setEditingMilestone(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-dark-900/60 backdrop-blur-sm" onClick={() => setEditingTask(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto animate-scale-in">
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
