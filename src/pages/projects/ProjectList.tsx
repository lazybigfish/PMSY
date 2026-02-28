import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Project } from '../../types';
import { useAuth } from '../../context/AuthContextNew';
import { useTheme } from '../../context/ThemeContext';
import { Plus, Search, Layers, FileText, Eye, Trash2, Activity, Sparkles, TrendingUp, CheckCircle, Globe, Wallet } from 'lucide-react';
import { numberToChinese } from '../../lib/utils';
import { ThemedButton } from '../../components/theme/ThemedButton';
import { ThemedCard } from '../../components/theme/ThemedCard';
import { ThemedInput } from '../../components/theme/ThemedInput';
import { ThemedBadge } from '../../components/theme/ThemedBadge';
import { ThemedTable } from '../../components/theme/ThemedTable';
import { ThemedConfirmModal } from '../../components/theme/ThemedModal';
import { MobileProjectCard } from './components/MobileProjectCard';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface ProjectWithDetails extends Project {
  current_stage_name?: string;
  module_progress?: number;
  member_count?: number;
  health_score?: number;
  user_role?: 'manager' | 'member' | null;
  total_payment?: number;
  payment_percentage?: number;
}

const ProjectList = () => {
  const { user, profile } = useAuth();
  const { themeConfig } = useTheme();
  const { colors } = themeConfig;
  const isDark = colors.background.main === '#0A0A0F';
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [projects, setProjects] = useState<ProjectWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [finalStageName, setFinalStageName] = useState<string>('运维阶段');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchFinalStageName();
  }, []);

  const fetchFinalStageName = async () => {
    try {
      const { data: activeVersion } = await api.db
        .from('template_versions')
        .select('id')
        .eq('is_active', true)
        .single();

      if (activeVersion?.data) {
        const { data: lastStage } = await api.db
          .from('milestone_templates')
          .select('name')
          .eq('version_id', activeVersion.data.id)
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

      // 创建用户角色映射（供后续使用）
      const userRoleMap = new Map<string, 'manager' | 'member'>();

      // 获取当前用户是成员的项目ID列表（用于显示角色）
      const { data: userMemberships } = await api.db
        .from('project_members')
        .select('project_id, role')
        .eq('user_id', user?.id);

      if (userMemberships) {
        userMemberships.forEach((membership: { project_id: string; role: 'manager' | 'member' }) => {
          userRoleMap.set(membership.project_id, membership.role);
        });
      }

      // 获取项目数据（后端已根据用户角色进行权限过滤）
      const { data: projectsData } = await api.db
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      // 获取所有里程碑
      const { data: milestones } = await api.db
        .from('project_milestones')
        .select('project_id, status, name, phase_order');

      // 获取所有模块
      const { data: modules } = await api.db
        .from('project_modules')
        .select('project_id, status, progress');

      // 获取所有风险
      const { data: risks } = await api.db
        .from('risks')
        .select('project_id, level, status');

      // 获取成员数量
      const { data: members } = await api.db
        .from('project_members')
        .select('project_id');

      // 获取所有项目的回款数据
      const { data: payments } = await api.db
        .from('client_payments')
        .select('project_id, amount');

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

      // 计算每个项目的回款总额
      const paymentsByProject: Record<string, number> = {};
      payments?.forEach((p: any) => {
        paymentsByProject[p.project_id] = (paymentsByProject[p.project_id] || 0) + (Number(p.amount) || 0);
      });

      // 处理数据
      const projectsWithDetails = (projectsData || []).map((project: any) => {
        const projectMilestones = milestonesByProject[project.id] || [];
        const sortedMilestones = projectMilestones.sort((a: any, b: any) => a.phase_order - b.phase_order);
        const currentMilestone = sortedMilestones.find((m: any) => m.status === 'in_progress') || sortedMilestones[0];

        const projectModules = modulesByProject[project.id] || [];
        const totalModules = projectModules.length;
        const totalProgress = projectModules.reduce((sum: number, m: any) => sum + (Number(m.progress) || 0), 0);
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
        // 管理员视为所有项目的经理
        if (profile?.role === 'admin' || project.manager_id === user?.id) {
          userRole = 'manager';
        } else {
          userRole = userRoleMap.get(project.id) || null;
        }

        // 计算回款金额和比例
        const totalPayment = paymentsByProject[project.id] || 0;
        const paymentPercentage = project.amount > 0 ? (totalPayment / project.amount) * 100 : 0;

        return {
          ...project,
          current_stage_name: currentMilestone?.name || '未设置',
          module_progress: moduleProgress,
          member_count: memberCount,
          health_score: healthScore,
          user_role: userRole,
          total_payment: totalPayment,
          payment_percentage: paymentPercentage
        };
      });

      setProjects(projectsWithDetails);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (projectId: string) => {
    setProjectToDelete(projectId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    
    try {
      await api.db.from('projects').delete().eq('id', projectToDelete);
      setProjects(prevProjects => prevProjects.filter(p => p.id !== projectToDelete));
      setDeleteModalOpen(false);
      setProjectToDelete(null);
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

  const getStageColor = (stageName: string): { bg: string; text: string } => {
    const stageColors: Record<string, { bg: string; text: string }> = {
      '进场前阶段': { bg: isDark ? 'rgba(100,116,139,0.3)' : '#f1f5f9', text: isDark ? '#94a3b8' : '#64748b' },
      '启动阶段': { bg: isDark ? 'rgba(59,130,246,0.2)' : '#dbeafe', text: isDark ? '#60a5fa' : '#2563eb' },
      '实施阶段': { bg: isDark ? 'rgba(139,92,246,0.2)' : '#ede9fe', text: isDark ? '#a78bfa' : '#7c3aed' },
      '初验阶段': { bg: isDark ? 'rgba(168,85,247,0.2)' : '#f3e8ff', text: isDark ? '#c084fc' : '#9333ea' },
      '试运行阶段': { bg: isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7', text: isDark ? '#fbbf24' : '#d97706' },
      '终验阶段': { bg: isDark ? `${colors.primary[500]}30` : `${colors.primary[100]}`, text: colors.primary[600] },
      '运维阶段': { bg: isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5', text: isDark ? '#34d399' : '#059669' },
    };
    return stageColors[stageName] || { bg: isDark ? 'rgba(100,116,139,0.3)' : '#f1f5f9', text: isDark ? '#94a3b8' : '#64748b' };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <ThemedBadge variant="secondary" size="sm">待处理</ThemedBadge>;
      case 'in_progress':
        return <ThemedBadge variant="success" size="sm">进行中</ThemedBadge>;
      case 'completed':
        return <ThemedBadge variant="primary" size="sm">已完成</ThemedBadge>;
      default:
        return <ThemedBadge variant="secondary" size="sm">未知</ThemedBadge>;
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

  // 获取回款比例颜色
  const getPaymentPercentageColor = (percentage: number) => {
    if (percentage >= 80) return isDark ? '#34d399' : '#059669';
    if (percentage >= 50) return colors.primary[600];
    if (percentage >= 20) return isDark ? '#fbbf24' : '#d97706';
    return isDark ? '#f87171' : '#dc2626';
  };

  // 获取回款比例背景色
  const getPaymentPercentageBgColor = (percentage: number) => {
    if (percentage >= 80) return isDark ? '#10b981' : '#10b981';
    if (percentage >= 50) return colors.primary[500];
    if (percentage >= 20) return isDark ? '#f59e0b' : '#f59e0b';
    return isDark ? '#ef4444' : '#ef4444';
  };

  // 获取健康度颜色
  const getHealthColor = (score: number) => {
    if (score >= 80) return isDark ? '#34d399' : '#059669';
    if (score >= 60) return isDark ? '#fbbf24' : '#d97706';
    return isDark ? '#f87171' : '#dc2626';
  };

  const columns = [
    {
      key: 'index',
      title: '序号',
      width: '60px',
      render: (project: ProjectWithDetails) => {
        const index = filteredProjects.findIndex(p => p.id === project.id);
        return <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{index + 1}</span>;
      },
    },
    {
      key: 'info',
      title: '项目信息',
      render: (project: ProjectWithDetails) => (
        <div className="flex flex-col">
          <div className="flex items-center">
            <span 
              className={`text-base font-bold hover:opacity-80 transition-colors duration-200 cursor-pointer ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
              style={{ color: isDark ? undefined : colors.primary[600] }}
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              {project.name}
            </span>
            {project.is_public && (
              <span title="公开项目" className="ml-2">
                <Eye className="h-4 w-4" style={{ color: isDark ? '#34d399' : '#059669' }} />
              </span>
            )}
          </div>
          <span className={`text-sm mt-1 line-clamp-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {project.customer_name || '暂无客户信息'}
          </span>
          <div className="flex items-center mt-2 space-x-3">
            <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              <Layers className="w-3 h-3" />
              {project.member_count || 0} 成员
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      title: '项目金额',
      width: '240px',
      render: (project: ProjectWithDetails) => (
        <div className="text-right">
          <div className="text-sm font-mono font-semibold" style={{ color: colors.primary[600] }}>
            <span className="font-normal mr-1" style={{ color: isDark ? '#9ca3af' : '#9ca3af' }}>合同额</span>{formatAmount(project.amount)}
          </div>
          <div className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {numberToChinese(project.amount || 0)}
          </div>
          
          {project.total_payment > 0 && (
            <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : colors.border.light}` }}>
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm font-mono font-semibold" style={{ color: isDark ? '#34d399' : '#059669' }}>
                  <span className="font-normal mr-1" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>已回款</span>{formatAmount(project.total_payment)}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 mt-1">
                <div className="w-16 rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border.light }}>
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${Math.min(project.payment_percentage || 0, 100)}%`,
                      backgroundColor: getPaymentPercentageBgColor(project.payment_percentage || 0)
                    }}
                  />
                </div>
                <span className="text-xs font-semibold" style={{ color: getPaymentPercentageColor(project.payment_percentage || 0) }}>
                  {(project.payment_percentage || 0).toFixed(1)}%
                </span>
              </div>
            </div>
          )}
          
          {(!project.total_payment || project.total_payment === 0) && (
            <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : colors.border.light}` }}>
              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>暂无回款</span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'stage',
      title: '当前阶段',
      width: '100px',
      render: (project: ProjectWithDetails) => {
        const stageStyle = getStageColor(project.current_stage_name || '');
        return (
          <div className="flex items-center justify-center">
            <span 
              onClick={() => navigate(`/projects/${project.id}?tab=milestones`)}
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 hover:scale-105 transition-all duration-200 whitespace-nowrap"
              style={{ 
                backgroundColor: stageStyle.bg, 
                color: stageStyle.text 
              }}
            >
              {project.current_stage_name || '未设置'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'progress',
      title: '进度',
      width: '120px',
      render: (project: ProjectWithDetails) => (
        <div 
          onClick={() => navigate(`/projects/${project.id}?tab=modules`)}
          className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity duration-200"
        >
          <div className="w-20 rounded-full h-2.5 mr-3 overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border.light }}>
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${project.module_progress || 0}%`,
                background: `linear-gradient(90deg, ${colors.primary[500]}, ${colors.secondary[500]})`
              }}
            />
          </div>
          <span className={`text-sm font-semibold w-10 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            {project.module_progress || 0}%
          </span>
        </div>
      ),
    },
    {
      key: 'health',
      title: '健康度',
      width: '100px',
      render: (project: ProjectWithDetails) => (
        <div 
          onClick={() => navigate(`/projects/${project.id}?tab=risks`)}
          className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity duration-200"
        >
          <Activity className="h-4 w-4 mr-1.5" style={{ color: getHealthColor(project.health_score || 0) }} />
          <span className="font-bold" style={{ color: getHealthColor(project.health_score || 0) }}>
            {project.health_score}%
          </span>
        </div>
      ),
    },
    {
      key: 'role',
      title: '我的角色',
      width: '90px',
      render: (project: ProjectWithDetails) => (
        <div className="flex items-center justify-center">
          {project.user_role ? (
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap"
              style={{
                backgroundColor: project.user_role === 'manager' ? (isDark ? `${colors.primary[500]}20` : colors.primary[100]) : (isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5'),
                color: project.user_role === 'manager' ? colors.primary[600] : '#059669'
              }}
            >
              {project.user_role === 'manager' ? '项目经理' : '团队成员'}
            </span>
          ) : (
            <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>-</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: '110px',
      render: (project: ProjectWithDetails) => (
        <div className="flex items-center justify-center">
          <button
            onClick={() => navigate(`/projects/${project.id}`)}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 hover:shadow-sm whitespace-nowrap"
            style={{
              backgroundColor: isDark ? `${colors.primary[500]}15` : colors.primary[50],
              color: colors.primary[600],
              border: `1px solid ${isDark ? `${colors.primary[500]}30` : colors.primary[200]}`,
            }}
          >
            <FileText className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
            详情
          </button>
          {project.user_role === 'manager' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(project.id);
              }}
              className="inline-flex items-center p-1.5 rounded-lg transition-all duration-200 hover:shadow-sm ml-2 flex-shrink-0"
              style={{
                color: isDark ? '#f87171' : '#ef4444',
                backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const statsCards = [
    {
      id: 'total',
      title: '项目总数',
      value: projects.length,
      icon: Layers,
      color: colors.primary[500],
    },
    {
      id: 'budget',
      title: '合同总金额',
      value: formatAmount(
        projects
          .filter(p => p.manager_id === user?.id)
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
      ),
      subtitle: '作为项目经理',
      icon: TrendingUp,
      color: colors.secondary[500],
    },
    {
      id: 'completed',
      title: '已验收项目',
      value: projects.filter(p => p.manager_id === user?.id && p.current_stage_name === finalStageName).length,
      subtitle: '作为项目经理',
      icon: CheckCircle,
      color: isDark ? '#34d399' : '#059669',
    },
    {
      id: 'public',
      title: '公开项目',
      value: projects.filter(p => p.is_public).length,
      subtitle: '全员可见',
      icon: Globe,
      color: isDark ? '#fbbf24' : '#d97706',
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse"
              style={{
                background: `linear-gradient(135deg, ${colors.primary[400]}, ${colors.primary[600]})`,
                boxShadow: `0 0 30px ${colors.primary[500]}40`,
              }}
            >
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <div
              className="absolute inset-0 w-16 h-16 rounded-2xl blur-xl opacity-50 animate-pulse"
              style={{
                background: `linear-gradient(135deg, ${colors.primary[400]}, ${colors.primary[600]})`,
              }}
            />
          </div>
          <p className={`mt-4 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            正在加载项目数据...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 animate-fade-in">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>项目管理</h1>
          <p className={`mt-1 sm:mt-2 text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            管理项目全生命周期，跟踪进度与里程碑
          </p>
        </div>
        <Link to="/projects/new">
          <ThemedButton variant="primary" size="sm" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">新建项目</span>
            <span className="sm:hidden">新建</span>
          </ThemedButton>
        </Link>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {statsCards.map((stat) => (
          <ThemedCard
            key={stat.id}
            variant="default"
            className="hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ease-out cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <span className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {stat.title}
              </span>
              <div
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
                style={{ 
                  backgroundColor: isDark ? `${stat.color}20` : `${stat.color}15`,
                  color: stat.color 
                }}
              >
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </div>
            {stat.subtitle && (
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {stat.subtitle}
              </p>
            )}
          </ThemedCard>
        ))}
      </div>

      {/* 搜索和筛选 */}
      <ThemedCard variant="default">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="flex-1">
            <ThemedInput
              type="text"
              icon={<Search className="h-4 w-4 sm:h-5 sm:w-5" />}
              placeholder="搜索项目名称、客户或描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 sm:gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'in_progress' | 'completed')}
              className={`px-3 sm:px-4 py-2 sm:py-3 rounded-xl border outline-none transition-all duration-200 text-sm ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 text-gray-200 focus:border-cyan-500' 
                  : 'bg-white border-gray-200 text-gray-700 focus:border-orange-300'
              }`}
            >
              <option value="all">全部状态</option>
              <option value="pending">待处理</option>
              <option value="in_progress">进行中</option>
              <option value="completed">已完成</option>
            </select>
          </div>
        </div>
      </ThemedCard>

      {/* 项目列表 */}
      {isMobile ? (
        // 移动端使用卡片式布局
        <div className="space-y-3">
          {filteredProjects.map((project, index) => (
            <MobileProjectCard
              key={project.id}
              project={project}
              index={index}
              onDelete={handleDeleteClick}
              isDark={isDark}
              colors={colors}
            />
          ))}
          {filteredProjects.length === 0 && (
            <div className="text-center py-8 text-dark-500 dark:text-dark-400">
              <p>暂无项目数据</p>
            </div>
          )}
        </div>
      ) : (
        // 桌面端使用表格布局
        <ThemedCard variant="default" className="overflow-hidden p-0">
          <ThemedTable
            columns={columns}
            data={filteredProjects}
            loading={false}
            emptyText="暂无项目数据"
          />
        </ThemedCard>
      )}

      {/* 删除确认弹窗 */}
      <ThemedConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setProjectToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="删除项目"
        message="确定要删除此项目吗？此操作不可恢复，项目相关的所有数据（任务、里程碑、文档等）都将被删除。"
        type="danger"
        confirmText="确认删除"
        cancelText="取消"
      />
    </div>
  );
};

export default ProjectList;
