
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Plus } from 'lucide-react';
import { Client } from '../../types';

// Milestone Templates Definition
const MILESTONE_TEMPLATES = [
  {
    name: '进场前阶段',
    phase_order: 1,
    tasks: [
      { name: '获取基础材料', description: '收集项目可研文件、项目合同', is_required: true, output_documents: [{ name: "可研文件", required: true }, { name: "项目合同", required: true }] },
      { name: '风险与预算分析', description: '基于可研和合同，输出《项目风险清单》和《项目预算规划表》', is_required: true, output_documents: [{ name: "项目风险清单", required: true }, { name: "项目预算规划表", required: true }] },
      { name: '组建项目团队', description: '根据建设方向（自研/外采）明确团队成员，输出《项目团队成员表》', is_required: true, output_documents: [{ name: "项目团队成员表", required: true }] },
      { name: '召开内部启动会', description: '整合前期材料，形成会议纪要', is_required: true, output_documents: [{ name: "内部启动会会议纪要", required: true }] },
      { name: '明确干系人', description: '梳理甲方负责人及联系人，输出《项目干系人清单》', is_required: true, output_documents: [{ name: "项目干系人清单", required: true }] },
    ]
  },
  {
    name: '启动阶段',
    phase_order: 2,
    tasks: [
      { name: '编制基础文档', description: '输出《项目经理授权函》《开工报审表》', is_required: true, output_documents: [{ name: "项目经理授权函", required: true }, { name: "开工报审表", required: true }] },
      { name: '拆解建设内容', description: '形成《项目实施功能清单》和《项目实施方案》', is_required: true, output_documents: [{ name: "项目实施功能清单", required: true }, { name: "项目实施方案", required: true }] },
      { name: '制定进度计划', description: '输出《项目实施计划表》', is_required: true, output_documents: [{ name: "项目实施计划表", required: true }] },
      { name: '召开项目启动会', description: '明确议程、参会人，最终输出《开工令》和《会议纪要》', is_required: true, output_documents: [{ name: "开工令", required: true }, { name: "项目启动会会议纪要", required: true }] },
      { name: '筹备服务器资源', description: '申请并确认资源，输出《服务器资源清单》', is_required: true, output_documents: [{ name: "服务器资源清单", required: true }] },
      { name: '供应商/硬件下单', description: '根据功能清单签订合同', is_required: false, output_documents: [{ name: "采购合同", required: false }] },
    ]
  },
  {
    name: '实施阶段',
    phase_order: 3,
    tasks: [
      { name: '需求调研', description: '输出全套设计文档（需求规格、数据库设计、概要/详细设计说明书）', is_required: true, output_documents: [{ name: "需求规格说明书", required: true }, { name: "数据库设计说明书", required: true }, { name: "概要设计说明书", required: true }, { name: "详细设计说明书", required: true }] },
      { name: '系统部署', description: '在已申请服务器上部署系统，更新《服务器资源清单》', is_required: true, output_documents: [{ name: "系统部署文档", required: true }, { name: "服务器资源清单（更新）", required: true }] },
      { name: '第三方测评', description: '开展软件测试、三级等保测评、商用密码测评（均需提前三个月筹备），输出对应报告', is_required: true, output_documents: [{ name: "软件测试报告", required: true }, { name: "三级等保测评报告", required: true }, { name: "商用密码测评报告", required: true }] },
      { name: '培训与自查', description: '组织用户培训并记录；项目组进行功能点自查，输出《功能点验表》', is_required: true, output_documents: [{ name: "用户培训记录", required: true }, { name: "功能点验表", required: true }] },
      { name: '监理核查', description: '由监理方对功能进行核验', is_required: true, output_documents: [{ name: "监理核查报告", required: true }] },
    ]
  },
  {
    name: '初验阶段',
    phase_order: 4,
    tasks: [
      { name: '整理验收文档', description: '编制完整的《文档目录》', is_required: true, output_documents: [{ name: "文档目录", required: true }] },
      { name: '筹备并召开初验会', description: '提交初验申请，形成《初步验收报告》', is_required: true, output_documents: [{ name: "初验申请", required: true }, { name: "初步验收报告", required: true }] },
      { name: '整改专家意见', description: '针对问题输出《遗留问题整改报告》', is_required: true, output_documents: [{ name: "遗留问题整改报告", required: true }] },
      { name: '上线试运行', description: '提交《试运行申请》，系统进入试运行期', is_required: true, output_documents: [{ name: "试运行申请", required: true }] },
    ]
  },
  {
    name: '试运行阶段',
    phase_order: 5,
    tasks: [
      { name: '试运行保障', description: '持续监控并记录运行情况', is_required: true, output_documents: [{ name: "试运行记录", required: true }] },
      { name: '项目结算与决算', description: '依次输出《结算报告》和《决算报告》', is_required: true, output_documents: [{ name: "结算报告", required: true }, { name: "决算报告", required: true }] },
    ]
  },
  {
    name: '终验阶段',
    phase_order: 6,
    tasks: [
      { name: '试运行总结', description: '输出《试运行总结报告》', is_required: true, output_documents: [{ name: "试运行总结报告", required: true }] },
      { name: '终验筹备与召开', description: '提交终验申请，形成《终验报告》', is_required: true, output_documents: [{ name: "终验申请", required: true }, { name: "终验报告", required: true }] },
      { name: '终验整改', description: '再次整改专家意见，更新《遗留问题整改报告》', is_required: true, output_documents: [{ name: "遗留问题整改报告（更新）", required: true }] },
    ]
  },
  {
    name: '运维阶段',
    phase_order: 7,
    tasks: [
      { name: '项目移交', description: '整理全部过程材料，输出《移交清单》，正式移交运维', is_required: true, output_documents: [{ name: "移交清单", required: true }, { name: "项目过程材料归档", required: true }] },
    ]
  },
];

const ProjectCreate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientSelect, setShowClientSelect] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    customer_name: '',
    amount: '',
    description: '',
    is_public: false,
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setFormData({ ...formData, customer_name: client.name });
    setShowClientSelect(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // 1. Create Project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert([
          {
            name: formData.name,
            customer_name: formData.customer_name,
            amount: parseFloat(formData.amount) || 0,
            description: formData.description,
            is_public: formData.is_public,
            manager_id: user.id,
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (projectError) throw projectError;

      const projectId = project.id;

      // 1.5 Create Project-Client association if client selected
      if (selectedClient) {
        const { error: projectClientError } = await supabase
          .from('project_clients')
          .insert({
            project_id: projectId,
            client_id: selectedClient.id,
            contract_amount: parseFloat(formData.amount) || 0,
          });

        if (projectClientError) {
          console.error('Error creating project-client association:', projectClientError);
        }
      }

      let firstMilestoneId = null;

      // 2. Add creator as Project Manager
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: user.id,
          role: 'manager'
        });

      if (memberError) {
        console.error('Error adding project manager:', memberError);
      }

      // 3. Initialize Milestones & Tasks (并行处理以提高性能)
      // Note: In a production environment, this should be handled by a database trigger or edge function
      // to ensure atomicity. Here we do it client-side for simplicity given the constraints.

      // 首先并行创建所有里程碑
      const milestonePromises = MILESTONE_TEMPLATES.map(template =>
        supabase
          .from('project_milestones')
          .insert({
            project_id: projectId,
            name: template.name,
            phase_order: template.phase_order,
            status: template.phase_order === 1 ? 'in_progress' : 'pending',
            description: `项目阶段 ${template.phase_order}: ${template.name}`
          })
          .select()
          .single()
      );

      const milestoneResults = await Promise.all(milestonePromises);

      // 收集任务插入请求
      const taskPromises: Promise<any>[] = [];

      milestoneResults.forEach((result, index) => {
        if (result.error) {
          console.error(`Error creating milestone ${MILESTONE_TEMPLATES[index].name}:`, result.error);
          return;
        }

        const milestone = result.data;
        const template = MILESTONE_TEMPLATES[index];

        if (template.phase_order === 1) {
          firstMilestoneId = milestone.id;
        }

        // 批量插入任务
        if (template.tasks && template.tasks.length > 0) {
          const tasksToInsert = template.tasks.map(t => ({
            milestone_id: milestone.id,
            name: t.name,
            description: t.description,
            is_required: t.is_required,
            output_documents: t.output_documents
          }));

          taskPromises.push(
            (async () => {
              const { error } = await supabase.from('milestone_tasks').insert(tasksToInsert);
              if (error) {
                console.error(`Error creating tasks for ${template.name}:`, error);
              }
            })()
          );
        }
      });

      // 并行执行所有任务插入
      if (taskPromises.length > 0) {
        await Promise.all(taskPromises);
      }

      // 4. Update Project with Current Milestone
      if (firstMilestoneId) {
        await supabase
          .from('projects')
          .update({ current_milestone_id: firstMilestoneId })
          .eq('id', projectId);
      }

      navigate(`/projects/${projectId}`);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('创建项目失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">新建项目</h1>
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            项目名称
          </label>
          <input
            type="text"
            id="name"
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            客户名称
          </label>
          <div className="mt-1 relative">
            <button
              type="button"
              onClick={() => setShowClientSelect(!showClientSelect)}
              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-left focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white"
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
          <input
            type="hidden"
            required
            value={formData.customer_name}
            onChange={() => {}}
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            项目金额 (¥)
          </label>
          <input
            type="number"
            id="amount"
            required
            min="0"
            step="0.01"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            项目描述
          </label>
          <textarea
            id="description"
            rows={4}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="flex items-center">
          <input
            id="is_public"
            type="checkbox"
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            checked={formData.is_public}
            onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
          />
          <label htmlFor="is_public" className="ml-2 block text-sm text-gray-900">
            公开项目（对所有用户可见）
          </label>
        </div>

        <div className="flex justify-end space-x-3">
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
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : '创建项目'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProjectCreate;
