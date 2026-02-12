
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Project } from '../../types';
import { ArrowLeft, Edit2, Package, Flag, AlertTriangle, FileText, Layers, BarChart3, Sparkles, X, Check, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ProjectOverview from './tabs/ProjectOverview';
import FunctionalModules from './tabs/FunctionalModules';
import Milestones from './tabs/Milestones';
import Risks from './tabs/Risks';
import Reports from './tabs/Reports';
import Suppliers from './tabs/Suppliers';

// ProjectOverviewProps is defined in ProjectOverview.tsx

const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const activeTab = searchParams.get('tab') || 'overview';

  const [canEdit, setCanEdit] = useState(false);
  const [canViewAll, setCanViewAll] = useState(false);

  // Redirect to overview if non-member tries to access other tabs
  useEffect(() => {
    if (!canViewAll && activeTab !== 'overview') {
      setSearchParams({ tab: 'overview' });
    }
  }, [canViewAll, activeTab, setSearchParams]);

  useEffect(() => {
    if (id) {
      fetchProjectDetails();
      checkEditPermission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const checkEditPermission = async () => {
    if (!user || !id) return;
    
    // Check if user is manager in project_members
    await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .single();

    // Permission granted if user is project manager (from projects table) OR has 'manager' role in members
    // Note: We'll set the final permission after project data is loaded,
    // but here we check the members table part.
    // Actually, let's wait for project fetch to complete to check project.manager_id
  };

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      
      // 获取项目信息
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          manager:profiles(id, full_name, email)
        `)
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);
      setEditForm(projectData);

      // Check permissions
      if (user) {
        const isCreator = projectData.manager_id === user.id;
        const isAdmin = profile?.role === 'admin';
        
        const { data: memberData } = await supabase
            .from('project_members')
            .select('role')
            .eq('project_id', id)
            .eq('user_id', user.id)
            .single();
            
        const isManager = memberData?.role === 'manager';
        const isMember = !!memberData;
        
        // Can edit if creator, admin, or manager
        setCanEdit(isCreator || isAdmin || isManager);
        
        // Can view all if creator, admin, manager, or member
        setCanViewAll(isCreator || isAdmin || isManager || isMember);
      }

    } catch (error) {
      console.error('Error fetching project details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProject = async () => {
    try {
      // Create a clean update object
      const updates = {
        name: editForm.name,
        customer_name: editForm.customer_name,
        amount: editForm.amount,
        description: editForm.description,
        is_public: editForm.is_public
      };

      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Update project_clients association if client changed
      if (selectedClientId) {
        // Check if association exists
        const { data: existing } = await supabase
          .from('project_clients')
          .select('id')
          .eq('project_id', id)
          .single();

        if (existing) {
          // Update existing
          await supabase
            .from('project_clients')
            .update({
              client_id: selectedClientId,
              contract_amount: editForm.amount || 0
            })
            .eq('id', existing.id);
        } else {
          // Create new
          await supabase
            .from('project_clients')
            .insert({
              project_id: id,
              client_id: selectedClientId,
              contract_amount: editForm.amount || 0
            });
        }
      }
      
      setProject({ ...project!, ...updates });
      setIsEditing(false);
      setSelectedClientId(null);
      alert('项目更新成功');
    } catch (error) {
      console.error('Error updating project:', error);
      alert('更新项目失败');
    }
  };

  // All tabs for project members
  const allTabs = [
    { id: 'overview', label: '项目概览', icon: BarChart3, color: 'primary' },
    { id: 'modules', label: '功能模块', icon: Layers, color: 'violet' },
    { id: 'milestones', label: '里程碑', icon: Flag, color: 'mint' },
    { id: 'risks', label: '风险', icon: AlertTriangle, color: 'sun' },
    { id: 'suppliers', label: '供应商', icon: Package, color: 'dark' },
    { id: 'reports', label: '周日报', icon: FileText, color: 'primary' },
  ];

  // Only overview tab for non-members
  const limitedTabs = [
    { id: 'overview', label: '项目概览', icon: BarChart3, color: 'primary' },
  ];

  const tabs = canViewAll ? allTabs : limitedTabs;

  const getTabColors = (color: string, isActive: boolean) => {
    if (isActive) {
      switch (color) {
        case 'primary':
          return 'border-primary-500 text-primary-600';
        case 'violet':
          return 'border-violet-500 text-violet-600';
        case 'mint':
          return 'border-mint-500 text-mint-600';
        case 'sun':
          return 'border-sun-500 text-sun-600';
        default:
          return 'border-dark-500 text-dark-700';
      }
    }
    return 'border-transparent text-dark-500 hover:text-dark-700 hover:border-dark-300';
  };

  const getTabIconColors = (color: string, isActive: boolean) => {
    if (isActive) {
      switch (color) {
        case 'primary':
          return 'text-primary-500';
        case 'violet':
          return 'text-violet-500';
        case 'mint':
          return 'text-mint-500';
        case 'sun':
          return 'text-sun-500';
        default:
          return 'text-dark-500';
      }
    }
    return 'text-dark-400 group-hover:text-dark-500';
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

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-dark-100 flex items-center justify-center mb-6">
          <Layers className="w-10 h-10 text-dark-400" />
        </div>
        <p className="text-dark-600 font-medium text-lg">项目不存在或已被删除</p>
        <button
          onClick={() => navigate('/projects')}
          className="mt-6 btn-secondary"
        >
          <ArrowLeft className="w-4 h-4" />
          返回项目列表
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 返回按钮和标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/projects')}
            className="p-2.5 hover:bg-dark-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-dark-600" />
          </button>
          <div>
            {!isEditing ? (
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-display font-bold text-dark-900">{project.name}</h1>
                {project.is_public && (
                  <span className="badge badge-mint flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    公开
                  </span>
                )}
              </div>
            ) : (
              <input
                type="text"
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="text-2xl font-display font-bold text-dark-900 border-b-2 border-primary-300 focus:outline-none focus:border-primary-500 px-1 w-full bg-transparent"
              />
            )}
            <p className="text-sm text-dark-500 mt-1">
              {isEditing && editForm.customer_name 
                ? editForm.customer_name 
                : (project.customer_name || '暂无客户信息')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {activeTab === 'overview' && canEdit && (
            !isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="btn-secondary"
              >
                <Edit2 className="h-4 w-4" />
                编辑项目
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={() => { setIsEditing(false); setEditForm(project); }}
                  className="btn-ghost"
                >
                  <X className="h-4 w-4" />
                  取消
                </button>
                <button
                  onClick={handleUpdateProject}
                  className="btn-primary"
                >
                  <Check className="h-4 w-4" />
                  保存
                </button>
              </div>
            )
          )}
          {!canViewAll && (
            <span className="badge badge-dark flex items-center gap-1">
              <Eye className="w-3 h-3" />
              仅查看权限
            </span>
          )}
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="border-b border-dark-200">
        <nav className="-mb-px flex space-x-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSearchParams({ tab: tab.id })}
                className={`
                  group inline-flex items-center py-4 px-4 border-b-2 font-medium text-sm rounded-t-xl transition-all duration-200
                  ${getTabColors(tab.color, isActive)}
                `}
              >
                <tab.icon className={`-ml-0.5 mr-2 h-5 w-5 transition-colors ${getTabIconColors(tab.color, isActive)}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab 内容 */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <ProjectOverview 
            projectId={id!} 
            isEditing={isEditing && canEdit}
            editForm={editForm}
            onEditChange={setEditForm}
            project={project}
            onClientSelect={setSelectedClientId}
          />
        )}
        {canViewAll && activeTab === 'modules' && <FunctionalModules projectId={id!} />}
        {canViewAll && activeTab === 'milestones' && <Milestones projectId={id!} />}
        {canViewAll && activeTab === 'risks' && <Risks projectId={id!} />}
        {canViewAll && activeTab === 'suppliers' && <Suppliers projectId={id!} />}
        {canViewAll && activeTab === 'reports' && <Reports projectId={id!} />}
      </div>
    </div>
  );
};

export default ProjectDetail;
