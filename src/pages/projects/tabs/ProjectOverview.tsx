
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Project, Profile, Client } from '../../../types';
import { Plus, Trash2, Mail, Phone, Loader2, CheckSquare, AlertOctagon, Flag, Layers, Activity, ChevronDown } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface ProjectOverviewProps {
  projectId: string;
  isEditing?: boolean;
  editForm?: Partial<Project>;
  onEditChange?: (form: Partial<Project>) => void;
  project?: Project | null;
  onClientSelect?: (clientId: string | null) => void;
}

interface ProjectMember extends Profile {
  member_role: string;
  member_id: string;
}

const ProjectOverview: React.FC<ProjectOverviewProps> = ({ projectId, isEditing, editForm, onEditChange, project: propProject, onClientSelect }) => {
  const { user } = useAuth();
  const [localProject, setLocalProject] = useState<Project | null>(null);
  
  // Use propProject if available, otherwise fallback to local state
  const project = propProject || localProject;
  
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [stats, setStats] = useState({
    tasks: { completed: 0, total: 0 },
    risks: { closed: 0, total: 0 },
    milestones: { completed: 0, total: 0 },
    modules: { completed: 0, total: 0 }
  });

  const [healthScore, setHealthScore] = useState(100);
  const [hasSupplier, setHasSupplier] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [contractAmount, setContractAmount] = useState(0);
  const [clients, setClients] = useState<Client[]>([]);
  const [showClientSelect, setShowClientSelect] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [projectClient, setProjectClient] = useState<any>(null);

  useEffect(() => {
    // Only fetch project data if not provided via props
    if (!propProject) {
        fetchProjectData();
    } else {
        setLoading(false);
    }

    fetchMembers();
    fetchStats();
    fetchHealthScore();
    fetchSupplierInfo();
    fetchClients();
    fetchProjectClient();
  }, [projectId, propProject]);

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

  const fetchProjectClient = async () => {
    try {
      const { data, error } = await supabase
        .from('project_clients')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('project_id', projectId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      if (data) {
        setProjectClient(data);
        setSelectedClient(data.client);
      }
    } catch (error) {
      console.error('Error fetching project client:', error);
    }
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    onEditChange?.({ ...editForm, customer_name: client.name });
    onClientSelect?.(client.id);
    setShowClientSelect(false);
  };

  const fetchHealthScore = async () => {
    try {
        const { data: risks } = await supabase
            .from('risks')
            .select('level, status')
            .eq('project_id', projectId);
        
        let score = 100;
        if (risks && risks.length > 0) {
            const activeRisks = risks.filter((r: any) => r.status !== 'closed');
            if (activeRisks.length > 0) {
                const deductions = activeRisks.reduce((total: number, risk: any) => {
                    switch (risk.level) {
                        case 'high': return total + 20;
                        case 'medium': return total + 10;
                        case 'low': return total + 5;
                        default: return total;
                    }
                }, 0);
                score = Math.max(0, 100 - deductions);
            }
        }
        setHealthScore(score);
    } catch (error) {
        console.error('Error fetching health score:', error);
    }
  };

  const fetchSupplierInfo = async () => {
    try {
      // 查询项目关联的供应商
      const { data: suppliers, error } = await supabase
        .from('project_suppliers')
        .select('id, contract_amount')
        .eq('project_id', projectId);

      if (error) throw error;

      const hasSuppliers = suppliers && suppliers.length > 0;
      setHasSupplier(hasSuppliers);

      if (hasSuppliers) {
        // 获取所有关联供应商的ID
        const supplierIds = suppliers.map(s => s.id);

        // 计算合同金额总和
        const totalContract = suppliers?.reduce((sum, s) => sum + (s.contract_amount || 0), 0) || 0;
        setContractAmount(totalContract);

        // 查询已支付金额总和（从 supplier_payment_plans 表中筛选 status = 'paid' 的记录）
        const { data: payments, error: paymentError } = await supabase
          .from('supplier_payment_plans')
          .select('amount')
          .in('project_supplier_id', supplierIds)
          .eq('status', 'paid');

        if (paymentError) throw paymentError;

        const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        setPaidAmount(totalPaid);
      } else {
        setContractAmount(0);
        setPaidAmount(0);
      }
    } catch (error) {
      console.error('Error fetching supplier info:', error);
    }
  };

  const fetchStats = async () => {
    try {
        // Tasks
        const { count: tasksTotal } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('project_id', projectId);
        const { count: tasksCompleted } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'done');

        // Risks
        const { count: risksTotal } = await supabase.from('risks').select('*', { count: 'exact', head: true }).eq('project_id', projectId);
        const { count: risksClosed } = await supabase.from('risks').select('*', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'closed');

        // Milestones
        const { count: milestonesTotal } = await supabase.from('project_milestones').select('*', { count: 'exact', head: true }).eq('project_id', projectId);
        const { count: milestonesCompleted } = await supabase.from('project_milestones').select('*', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'completed');

        // Modules - 获取所有模块的 progress 字段计算平均值
        const { data: modulesData } = await supabase
            .from('project_modules')
            .select('progress, status')
            .eq('project_id', projectId);

        const modulesTotal = modulesData?.length || 0;
        const modulesCompleted = modulesData?.filter(m => m.status === 'completed').length || 0;
        // 计算所有模块的完成度平均值（基于 progress 字段）
        const totalProgress = modulesData?.reduce((sum, m) => sum + (m.progress || 0), 0) || 0;
        const moduleProgressAvg = modulesTotal > 0 ? Math.round(totalProgress / modulesTotal) : 0;

        setStats({
            tasks: { completed: tasksCompleted || 0, total: tasksTotal || 0 },
            risks: { closed: risksClosed || 0, total: risksTotal || 0 },
            milestones: { completed: milestonesCompleted || 0, total: milestonesTotal || 0 },
            modules: { completed: moduleProgressAvg, total: 100 } // 使用平均进度作为 completed，100 作为 total
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
    }
  };

  const fetchProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          manager:profiles(id, full_name, email)
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setLocalProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          role,
          user:profiles(*)
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      const formattedMembers: ProjectMember[] = data.map((item: any) => ({
        ...item.user,
        member_role: item.role,
        member_id: item.id
      }));

      setMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      
      const existingIds = new Set(members.map(m => m.id));
      setAllUsers(data?.filter(u => !existingIds.has(u.id)) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId) {
      alert('请先选择要添加的用户');
      return;
    }
    
    try {
      const { error } = await supabase.from('project_members').insert({
        project_id: projectId,
        user_id: selectedUserId,
        role: selectedRole
      });

      if (error) {
        if (error.message.includes('duplicate')) {
          alert('该用户已经是项目成员');
        } else {
          alert('添加成员失败: ' + error.message);
        }
        return;
      }

      setShowAddMember(false);
      setSelectedUserId('');
      fetchMembers();
    } catch (error: any) {
      console.error('Error adding member:', error);
      alert('添加成员失败: ' + (error?.message || '未知错误'));
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('确认移除该成员？')) return;

    try {
      const { error } = await supabase.from('project_members').delete().eq('id', memberId);
      if (error) throw error;
      fetchMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      alert('移除成员失败');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  if (!project) {
    return <div className="text-center py-8 text-gray-500">项目不存在</div>;
  }

  return (
    <div className="space-y-6">
      {/* Basic Info Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">项目基本信息</h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">建设内容/描述</dt>
              <dd className="mt-1 text-sm text-gray-900 line-clamp-3 hover:line-clamp-none transition-all duration-200">
                {!isEditing ? (
                  project.description || '暂无描述'
                ) : (
                  <textarea
                    rows={3}
                    value={editForm?.description || ''}
                    onChange={(e) => onEditChange?.({ ...editForm, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                )}
              </dd>
            </div>
            <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">客户名称</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {!isEditing ? (
                    selectedClient ? (
                      <div className="flex items-center">
                        <span className="font-medium">{selectedClient.name}</span>
                        {projectClient?.contract_amount > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            (合同: ¥{projectClient.contract_amount.toLocaleString()})
                          </span>
                        )}
                      </div>
                    ) : (
                      project.customer_name || '暂无客户信息'
                    )
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowClientSelect(!showClientSelect)}
                        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-left focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white flex items-center justify-between"
                      >
                        <span className={selectedClient ? 'text-gray-900' : 'text-gray-500'}>
                          {selectedClient ? selectedClient.name : '请选择客户...'}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </button>
                      
                      {showClientSelect && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                          {clients.length === 0 ? (
                            <div className="px-4 py-2 text-gray-500">暂无客户</div>
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
                  )}
                </dd>
            </div>
            <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">项目金额</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {!isEditing ? (
                    `¥${project.amount?.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`
                  ) : (
                    <div className="relative rounded-md shadow-sm">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-gray-500 sm:text-sm">¥</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm?.amount || ''}
                        onChange={(e) => onEditChange?.({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                        className="block w-full rounded-md border-gray-300 pl-7 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 border"
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </dd>
            </div>
            <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">健康度</dt>
                <dd className="mt-1 flex items-center">
                  <Activity className={`h-5 w-5 mr-2 ${
                    healthScore >= 80 ? 'text-green-600' :
                    healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`} />
                  <span className={`text-sm font-bold ${
                    healthScore >= 80 ? 'text-green-600' :
                    healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {healthScore} 分
                  </span>
                </dd>
            </div>
            <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">可见性</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {!isEditing ? (
                    project.is_public ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        公开项目
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                        私有项目
                      </span>
                    )
                  ) : (
                    <div className="flex items-center">
                      <input
                        id="is_public"
                        type="checkbox"
                        checked={editForm?.is_public || false}
                        onChange={(e) => onEditChange?.({ ...editForm, is_public: e.target.checked })}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_public" className="ml-2 block text-sm text-gray-900">
                        公开项目
                      </label>
                    </div>
                  )}
                </dd>
            </div>
            <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">创建时间</dt>
                <dd className="mt-1 text-sm text-gray-900">{new Date(project.created_at).toLocaleDateString()}</dd>
            </div>
            <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">是否有外采</dt>
                <dd className="mt-1 text-sm text-gray-900">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        hasSupplier ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                        {hasSupplier ? '是' : '否'}
                    </span>
                </dd>
            </div>
            {hasSupplier && (
                <>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">采购金额</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">
                            ¥{contractAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </dd>
                    </div>
                    <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">已支付金额</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">
                            ¥{paidAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </dd>
                    </div>
                </>
            )}
          </dl>
        </div>
        
        {/* Statistics Grid */}
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-500 mb-4">项目统计</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Task Stats */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.hash = '#modules'}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">任务统计</span>
                        <CheckSquare className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex items-end justify-between">
                        <div className="text-2xl font-bold text-gray-900">{stats.tasks.completed}/{stats.tasks.total}</div>
                        <div className="relative w-8 h-8">
                           <svg className="w-full h-full transform -rotate-90">
                             <circle cx="16" cy="16" r="14" stroke="#e5e7eb" strokeWidth="4" fill="none" />
                             <circle cx="16" cy="16" r="14" stroke="#3b82f6" strokeWidth="4" fill="none" strokeDasharray={`${(stats.tasks.completed / Math.max(stats.tasks.total, 1)) * 88} 88`} />
                           </svg>
                        </div>
                    </div>
                </div>

                {/* Risk Stats */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.search = '?tab=risks'}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">风险统计</span>
                        <AlertOctagon className="h-4 w-4 text-red-500" />
                    </div>
                    <div className="flex items-end justify-between">
                        <div className="text-2xl font-bold text-gray-900">{stats.risks.closed}/{stats.risks.total}</div>
                         <div className="relative w-8 h-8">
                           <svg className="w-full h-full transform -rotate-90">
                             <circle cx="16" cy="16" r="14" stroke="#e5e7eb" strokeWidth="4" fill="none" />
                             <circle cx="16" cy="16" r="14" stroke="#ef4444" strokeWidth="4" fill="none" strokeDasharray={`${(stats.risks.closed / Math.max(stats.risks.total, 1)) * 88} 88`} />
                           </svg>
                        </div>
                    </div>
                </div>

                {/* Milestone Stats */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.search = '?tab=milestones'}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">里程碑</span>
                        <Flag className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="flex flex-col">
                        <div className="text-2xl font-bold text-gray-900 mb-1">{stats.milestones.completed}/{stats.milestones.total}</div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(stats.milestones.completed / Math.max(stats.milestones.total, 1)) * 100}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Module Stats */}
                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.search = '?tab=modules'}>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-500">功能模块</span>
                        <Layers className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex flex-col">
                         <div className="text-2xl font-bold text-gray-900 mb-1">{stats.modules.completed}%</div>
                         <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                             <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${stats.modules.completed}%` }}></div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">团队成员</h3>
          {(user?.id === project?.manager_id || members.some(m => m.id === user?.id && m.member_role === 'manager') || user?.role === 'admin') && (
            <button
              onClick={() => {
                  fetchAllUsers();
                  setShowAddMember(true);
              }}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-1" />
              添加成员
            </button>
          )}
        </div>
        
        {showAddMember && (
            <div className="px-4 py-4 bg-gray-50 border-b border-gray-200 animate-fadeIn">
                {allUsers.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                        <p>暂无可添加的用户（所有用户都已是项目成员）</p>
                        <button 
                            onClick={() => setShowAddMember(false)} 
                            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                        >
                            关闭
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">选择用户</label>
                            <select 
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                            >
                                <option value="">请选择用户...</option>
                                {allUsers.map(user => (
                                    <option key={user.id} value={user.id}>{user.full_name || user.email}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-40">
                            <label className="block text-sm font-medium text-gray-700">角色</label>
                            <select 
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                            >
                                <option value="member">团队成员</option>
                                <option value="manager">项目经理</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleAddMember} disabled={!selectedUserId} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">确定</button>
                            <button onClick={() => setShowAddMember(false)} className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">取消</button>
                        </div>
                    </div>
                )}
            </div>
        )}

        <ul className="divide-y divide-gray-200">
          {loadingMembers ? (
             <li className="px-4 py-4 text-center text-gray-500">加载中...</li>
          ) : members.length === 0 ? (
             <li className="px-4 py-4 text-center text-gray-500">暂无团队成员</li>
          ) : (
            members.map((member) => (
              <li key={member.member_id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                        {member.full_name?.[0] || member.email?.[0] || 'U'}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{member.full_name || '未命名'}</div>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span className="flex items-center"><Mail className="w-3 h-3 mr-1"/> {member.email}</span>
                        {member.phone && <span className="flex items-center"><Phone className="w-3 h-3 mr-1"/> {member.phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.member_role === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                    }`}>
                        {member.member_role === 'manager' ? '项目经理' : '团队成员'}
                    </span>
                    {(user?.id === project?.manager_id || members.some(m => m.id === user?.id && m.member_role === 'manager') || user?.role === 'admin') && (
                      <button
                          onClick={() => handleRemoveMember(member.member_id)}
                          className="text-gray-400 hover:text-red-600"
                      >
                          <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default ProjectOverview;
