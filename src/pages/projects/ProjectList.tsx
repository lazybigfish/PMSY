
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Project } from '../../types';
import { useAuth } from '../../context/AuthContextNew';
import { Plus, Search, Loader2, Layers, FileText, Eye, Trash2, Activity, Sparkles, TrendingUp, CheckCircle, Globe } from 'lucide-react';

interface ProjectWithDetails extends Project {
  current_stage_name?: string;
  module_progress?: number;
  member_count?: number;
  health_score?: number;
  user_role?: 'manager' | 'member' | null;
}

const ProjectList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [finalStageName, setFinalStageName] = useState<string>('运维阶段');

  useEffect(() => {
    fetchProjects();
    fetchFinalStageName();
  }, []);

  const fetchFinalStageName = async () => {
    try {
      const activeVersion = await api.db
        .from('template_versions')
        .select('id')
        .eq('is_active', true)
        .single();

      if (activeVersion) {
        const lastStage = await api.db
          .from('milestone_templates')
          .select('name')
          .eq('version_id', activeVersion.id)
          .order('phase_order', { ascending: false })
          .limit(1);
        
        if (lastStage && lastStage[0]) {
          setFinalStageName(lastStage[0].name);
        }
      }
    } catch (error) {
      console.warn('Could not fetch final stage name:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      // 获取所有项目
      const projectsData = await api.db
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      // 获取当前用户在所有项目中的角色
      const userMemberships = await api.db
        .from('project_members')
        .select('project_id, role')
        .eq('user_id', user?.id);

      // 创建用户角色映射
      const userRoleMap = new Map<string, 'manager' | 'member'>();
      if (userMemberships) {
        userMemberships.forEach((membership: { project_id: string; role: 'manager' | 'member' }) => {
          userRoleMap.set(membership.project_id, membership.role);
        });
      }

      // 获取所有里程碑
      const milestones = await api.db
        .from('project_milestones')
        .select('project_id, status, name, phase_order');

      // 获取所有模块
      const modules = await api.db
        .from('project_modules')
        .select('project_id, status, progress');

      // 获取所有风险
      const risks = await api.db
        .from('risks')
        .select('project_id, level, status');

      // 获取成员数量
      const members = await api.db
        .from('project_members')
        .select('project_id');

      // 按项目分组数据
      const milestonesByProject: Record<string, any[]> = {};
      milestones?.forEach((m: any) => {
        if (!milestonesByProject[m.project_id]) milestonesByProject[m.project_id] = [];
        milestonesByProject[m.project_id].push(m);
      });

      const modulesByProject: Record<string, any[]> = {};
      modules?.forEach((m: any) => {
        if (!modulesByProject[m.project_id]) modulesByProject[m.project_id] = [];
        modulesByProject[m.project_id].push(m);
      });

      const risksByProject: Record<string, any[]> = {};
      risks?.forEach((r: any) => {
        if (!risksByProject[r.project_id]) risksByProject[r.project_id] = [];
        risksByProject[r.project_id].push(r);
      });

      const memberCountByProject: Record<string, number> = {};
      members?.forEach((m: any) => {
        memberCountByProject[m.project_id] = (memberCountByProject[m.project_id] || 0) + 1;
      });

      // 处理数据
      const projectsWithDetails = (projectsData || []).map((project: any) => {
        const projectMilestones = milestonesByProject[project.id] || [];
        const sortedMilestones = projectMilestones.sort((a: any, b: any) => a.phase_order - b.phase_order);
        const currentMilestone = sortedMilestones.find((m: any) => m.status === 'in_progress') || sortedMilestones[0];

        const projectModules = modulesByProject[project.id] || [];
        const totalModules = projectModules.length;
        const totalProgress = projectModules.reduce((sum: number, m: any) => sum + (m.progress || 0), 0);
        const moduleProgress = totalModules > 0 ? Math.round(totalProgress / totalModules) : 0;

        const memberCount = memberCountByProject[project.id] || 0;

        const projectRisks = risksByProject[project.id] || [];
        let healthScore = 100;
        if (projectRisks.length > 0) {
          const activeRisks = projectRisks.filter((r: any) => r.status !== 'closed');
          if (activeRisks.length > 0) {
            const deductions = activeRisks.reduce((total: number, risk: any) => {
              switch (risk.level) {
                case 'high': return total + 20;
                case 'medium': return total + 10;
                case 'low': return total + 5;
                default: return total;
              }
            }, 0);
            healthScore = Math.max(0, 100 - deductions);
          }
        }

        let userRole: 'manager' | 'member' | null = null;
        if (project.manager_id === user?.id) {
          userRole = 'manager';
        } else {
          userRole = userRoleMap.get(project.id) || null;
        }

        return {
          ...project,
          current_stage_name: currentMilestone?.name || '未设置',
          module_progress: moduleProgress,
          member_count: memberCount,
          health_score: healthScore,
          user_role: userRole
        };
      });

      setProjects(projectsWithDetails);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const confirmed = confirm('确定要删除此项目吗？此操作不可恢复。');
    
    if (!confirmed) return;
    
    try {
      await api.db.from('projects').delete().eq('id', projectId);
      setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('删除项目失败');
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStageColor = (stageName: string) => {
    const stageColors: Record<string, string> = {
      '进场前阶段': 'badge-dark',
      '启动阶段': 'bg-blue-100 text-blue-700',
      '实施阶段': 'bg-violet-100 text-violet-700',
      '初验阶段': 'bg-purple-100 text-purple-700',
      '试运行阶段': 'bg-sun-100 text-sun-700',
      '终验阶段': 'bg-primary-100 text-primary-700',
      '运维阶段': 'bg-mint-100 text-mint-700',
    };
    return stageColors[stageName] || 'badge-dark';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-dark">待处理</span>;
      case 'in_progress':
        return <span className="badge badge-mint">进行中</span>;
      case 'completed':
        return <span className="badge badge-violet">已完成</span>;
      default:
        return <span className="badge badge-dark">未知</span>;
    }
  };

  const formatAmount = (amount?: number) => {
    if (amount === undefined || amount === null) return '0.00';
    if (amount >= 100000000) {
      return (amount / 100000000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '亿';
    }
    if (amount >= 10000) {
      return (amount / 10000).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '万';
    }
    return '¥' + amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div className="absolute inset-0 w-16 h-16 rounded-2xl gradient-primary blur-xl opacity-50 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">项目管理</h1>
          <p className="page-subtitle">管理项目全生命周期，跟踪进度与里程碑</p>
        </div>
        <Link
          to="/projects/new"
          className="btn-primary shadow-glow"
        >
          <Plus className="h-5 w-5" />
          新建项目
        </Link>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card card-hover hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ease-out cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <span className="stat-label">项目总数</span>
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Layers className="w-5 h-5 text-primary-600" />
            </div>
          </div>
          <div className="stat-value text-gradient">{projects.length}</div>
        </div>

        <div className="stat-card card-hover hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ease-out cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <span className="stat-label">合同总金额</span>
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <TrendingUp className="w-5 h-5 text-violet-600" />
            </div>
          </div>
          <div className="stat-value text-violet-600">
            {formatAmount(
              projects
                .filter(p => p.manager_id === user?.id)
                .reduce((sum, p) => sum + (p.amount || 0), 0)
            )}
          </div>
          <p className="text-xs text-dark-400 mt-1">作为项目经理</p>
        </div>

        <div className="stat-card card-hover hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ease-out cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <span className="stat-label">已验收项目</span>
            <div className="w-10 h-10 rounded-xl bg-mint-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <CheckCircle className="w-5 h-5 text-mint-600" />
            </div>
          </div>
          <div className="stat-value text-mint-600">
            {projects.filter(p => p.manager_id === user?.id && p.current_stage_name === finalStageName).length}
          </div>
          <p className="text-xs text-dark-400 mt-1">作为项目经理</p>
        </div>

        <div className="stat-card card-hover hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ease-out cursor-pointer">
          <div className="flex items-center justify-between mb-3">
            <span className="stat-label">公开项目</span>
            <div className="w-10 h-10 rounded-xl bg-sun-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
              <Globe className="w-5 h-5 text-sun-600" />
            </div>
          </div>
          <div className="stat-value text-sun-600">
            {projects.filter(p => p.is_public).length}
          </div>
          <p className="text-xs text-dark-400 mt-1">全员可见</p>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-dark-400" />
            </div>
            <input
              type="text"
              className="input pl-12"
              placeholder="搜索项目名称、客户或描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'in_progress' | 'completed')}
              className="input w-40"
            >
              <option value="all">全部状态</option>
              <option value="pending">待处理</option>
              <option value="in_progress">进行中</option>
              <option value="completed">已完成</option>
            </select>
          </div>
        </div>
      </div>

      {/* 项目列表 */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-dark-100">
          <thead className="bg-dark-50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider">序号</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-dark-500 uppercase tracking-wider">项目信息</th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-dark-500 uppercase tracking-wider">项目金额</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-dark-500 uppercase tracking-wider">当前阶段</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-dark-500 uppercase tracking-wider">进度</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-dark-500 uppercase tracking-wider">健康度</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-dark-500 uppercase tracking-wider">我的角色</th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-semibold text-dark-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-dark-100">
            {filteredProjects.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-2xl bg-dark-100 flex items-center justify-center mb-4">
                      <Layers className="w-8 h-8 text-dark-400" />
                    </div>
                    <p className="text-dark-500 font-medium">暂无项目数据</p>
                    <p className="text-dark-400 text-sm mt-1">点击上方按钮创建第一个项目</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredProjects.map((project, index) => (
                <tr key={project.id} className="hover:bg-dark-50/50 hover:shadow-sm transition-all duration-200 ease-out group">
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-dark-500">
                    {index + 1}
                  </td>
                  <td 
                    className="px-6 py-5 min-w-[200px] cursor-pointer hover:bg-dark-100/50 transition-colors duration-200"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <span className="text-base font-bold text-dark-900 hover:text-primary-600 transition-colors duration-200">{project.name}</span>
                        {project.is_public && (
                          <span title="公开项目" className="ml-2">
                            <Eye className="h-4 w-4 text-mint-500" />
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-dark-500 mt-1 line-clamp-1">{project.customer_name || '暂无客户信息'}</span>
                      <div className="flex items-center mt-2 space-x-3">
                        <span className="text-xs text-dark-400 flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {project.member_count || 0} 成员
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-dark-900 text-right font-mono font-semibold">
                    {formatAmount(project.amount)}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    <span 
                      onClick={() => navigate(`/projects/${project.id}?tab=milestones`)}
                      className={`badge ${getStageColor(project.current_stage_name || '')} cursor-pointer hover:opacity-80 hover:scale-105 transition-all duration-200 inline-block`}
                    >
                      {project.current_stage_name || '未设置'}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    <div 
                      onClick={() => navigate(`/projects/${project.id}?tab=modules`)}
                      className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity duration-200"
                    >
                      <div className="w-20 bg-dark-200 rounded-full h-2.5 mr-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-primary-500 to-violet-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${project.module_progress || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-dark-700 w-10">{project.module_progress || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    <div 
                      onClick={() => navigate(`/projects/${project.id}?tab=risks`)}
                      className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity duration-200"
                    >
                      <Activity className={`h-4 w-4 mr-1.5 ${
                        (project.health_score || 0) >= 80 ? 'text-mint-500' :
                        (project.health_score || 0) >= 60 ? 'text-sun-500' : 'text-red-500'
                      }`} />
                      <span className={`font-bold ${
                        (project.health_score || 0) >= 80 ? 'text-mint-600' :
                        (project.health_score || 0) >= 60 ? 'text-sun-600' : 'text-red-600'
                      }`}>
                        {project.health_score}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-center">
                    {project.user_role ? (
                      <span className={`badge ${
                        project.user_role === 'manager' ? 'badge-violet' : 'badge-mint'
                      }`}>
                        {project.user_role === 'manager' ? '项目经理' : '团队成员'}
                      </span>
                    ) : (
                      <span className="text-dark-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold text-dark-700 bg-dark-100 hover:bg-dark-200 hover:scale-105 transition-all duration-200 ease-out"
                        title="详情"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        详情
                      </button>
                      {project.user_role === 'manager' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project.id);
                          }}
                          className="inline-flex items-center p-1.5 text-dark-400 hover:text-red-500 hover:bg-red-50 rounded-lg hover:scale-105 transition-all duration-200 ease-out"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectList;
