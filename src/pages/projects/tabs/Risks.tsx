
import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Risk, Profile } from '../../../types';
import { Loader2, Plus, AlertTriangle, X, History, User } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface RiskWithRecords extends Omit<Risk, 'handling_records'> {
  handling_records: {
    date: string;
    content: string;
    handler_id: string;
    handler?: Profile;
  }[];
}

interface RisksProps {
  projectId: string;
}

const Risks: React.FC<RisksProps> = ({ projectId }) => {
  const { user } = useAuth();
  const [risks, setRisks] = useState<RiskWithRecords[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<RiskWithRecords | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'handling' | 'closed'>('all');
  const [filterLevel, setFilterLevel] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [users, setUsers] = useState<Profile[]>([]);
  
  const [newRisk, setNewRisk] = useState({
    title: '',
    description: '',
    level: 'medium' as const,
    status: 'open' as const,
    impact: '',
    mitigation_plan: '',
    owner_id: ''
  });

  const [newRecord, setNewRecord] = useState({
    content: '',
    newStatus: ''
  });

  useEffect(() => {
    fetchRisks();
    fetchUsers();
  }, [projectId]);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*');
    setUsers(data || []);
  };

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('risks')
        .select(`
          *,
          owner:profiles(id, full_name, email)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRisks(data || []);
    } catch (error) {
      console.error('Error fetching risks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase.from('risks').insert([{
        project_id: projectId,
        ...newRisk,
        handling_records: []
      }]);

      if (error) throw error;
      
      setShowForm(false);
      setNewRisk({
        title: '',
        description: '',
        level: 'medium',
        status: 'open',
        impact: '',
        mitigation_plan: '',
        owner_id: ''
      });
      fetchRisks();
    } catch (error) {
      console.error('Error adding risk:', error);
      alert('添加风险失败');
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRisk || !user) return;

    const record = {
      date: new Date().toISOString(),
      content: newRecord.content,
      handler_id: user.id
    };

    const updatedRecords = [...(selectedRisk.handling_records || []), record];
    const updates: any = {
      handling_records: updatedRecords
    };

    if (newRecord.newStatus) {
      updates.status = newRecord.newStatus;
    }

    try {
      const { error } = await supabase
        .from('risks')
        .update(updates)
        .eq('id', selectedRisk.id);

      if (error) throw error;

      setRisks(risks.map(r => r.id === selectedRisk.id ? { ...r, ...updates } : r));
      setSelectedRisk({ ...selectedRisk, ...updates });
      setNewRecord({ content: '', newStatus: '' });
    } catch (error) {
      console.error('Error adding record:', error);
      alert('添加处置记录失败');
    }
  };

  const updateRiskStatus = async (riskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('risks')
        .update({ status: newStatus })
        .eq('id', riskId);

      if (error) throw error;
      setRisks(risks.map(r => r.id === riskId ? { ...r, status: newStatus as any } : r));
    } catch (error) {
      console.error('Error updating risk status:', error);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return level;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-100 text-red-800';
      case 'handling': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return '未处理';
      case 'handling': return '处理中';
      case 'closed': return '已关闭';
      default: return status;
    }
  };

  const filteredRisks = risks.filter(risk => {
    const matchesStatus = filterStatus === 'all' || risk.status === filterStatus;
    const matchesLevel = filterLevel === 'all' || risk.level === filterLevel;
    return matchesStatus && matchesLevel;
  });

  if (loading) return <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />;

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">项目风险</h3>
          <p className="text-sm text-gray-500 mt-1">风险识别、跟踪与处置管理</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          新增风险
        </button>
      </div>

      {/* 筛选栏 */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
        >
          <option value="all">全部状态</option>
          <option value="open">未处理</option>
          <option value="handling">处理中</option>
          <option value="closed">已关闭</option>
        </select>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as any)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
        >
          <option value="all">全部等级</option>
          <option value="high">高风险</option>
          <option value="medium">中风险</option>
          <option value="low">低风险</option>
        </select>
      </div>

      {/* 新增风险表单 */}
      {showForm && (
        <form onSubmit={handleAddRisk} className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">风险标题 *</label>
              <input 
                required 
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" 
                value={newRisk.title} 
                onChange={e => setNewRisk({...newRisk, title: e.target.value})} 
                placeholder="请输入风险标题"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">风险等级</label>
              <select 
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" 
                value={newRisk.level} 
                onChange={e => setNewRisk({...newRisk, level: e.target.value as any})}
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">责任人</label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm"
                value={newRisk.owner_id}
                onChange={e => setNewRisk({...newRisk, owner_id: e.target.value})}
              >
                <option value="">选择责任人</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">风险描述</label>
              <textarea 
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" 
                rows={2} 
                value={newRisk.description} 
                onChange={e => setNewRisk({...newRisk, description: e.target.value})}
                placeholder="描述风险的具体内容..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">影响分析</label>
              <textarea 
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" 
                rows={2} 
                value={newRisk.impact} 
                onChange={e => setNewRisk({...newRisk, impact: e.target.value})}
                placeholder="分析风险可能造成的影响..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">应对措施</label>
              <textarea 
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 sm:text-sm" 
                rows={2} 
                value={newRisk.mitigation_plan} 
                onChange={e => setNewRisk({...newRisk, mitigation_plan: e.target.value})}
                placeholder="制定风险应对措施..."
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button 
              type="button" 
              onClick={() => setShowForm(false)} 
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              取消
            </button>
            <button 
              type="submit" 
              className="px-3 py-2 border border-transparent rounded-md text-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              保存
            </button>
          </div>
        </form>
      )}

      {/* 风险列表 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">风险</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">等级</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">责任人</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">处置记录</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRisks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  暂无风险记录
                </td>
              </tr>
            ) : (
              filteredRisks.map((risk) => (
                <tr key={risk.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <AlertTriangle className={`h-5 w-5 mr-2 ${
                        risk.level === 'high' ? 'text-red-500' :
                        risk.level === 'medium' ? 'text-yellow-500' :
                        'text-blue-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{risk.title}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">{risk.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getLevelColor(risk.level)}`}>
                      {getLevelLabel(risk.level)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <select
                      value={risk.status}
                      onChange={(e) => updateRiskStatus(risk.id, e.target.value)}
                      className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(risk.status)}`}
                    >
                      <option value="open">未处理</option>
                      <option value="handling">处理中</option>
                      <option value="closed">已关闭</option>
                    </select>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(risk as any).owner?.full_name || (risk as any).owner?.email || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <History className="h-4 w-4 mr-1" />
                      {risk.handling_records?.length || 0} 条记录
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedRisk(risk);
                        setShowDetailModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      详情
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 风险详情弹窗 */}
      {showDetailModal && selectedRisk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <AlertTriangle className={`h-6 w-6 ${
                  selectedRisk.level === 'high' ? 'text-red-500' :
                  selectedRisk.level === 'medium' ? 'text-yellow-500' :
                  'text-blue-500'
                }`} />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedRisk.title}</h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getLevelColor(selectedRisk.level)}`}>
                      {getLevelLabel(selectedRisk.level)}风险
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(selectedRisk.status)}`}>
                      {getStatusLabel(selectedRisk.status)}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 风险详情 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">风险描述</h4>
                  <p className="text-sm text-gray-600">{selectedRisk.description || '暂无描述'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">影响分析</h4>
                  <p className="text-sm text-gray-600">{selectedRisk.impact || '暂无影响分析'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 md:col-span-2">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">应对措施</h4>
                  <p className="text-sm text-gray-600">{selectedRisk.mitigation_plan || '暂无应对措施'}</p>
                </div>
              </div>

              {/* 处置进展时间轴 */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">处置进展</h4>
                
                {/* 添加新记录 */}
                {selectedRisk.status !== 'closed' && (
                  <form onSubmit={handleAddRecord} className="bg-indigo-50 rounded-lg p-4 mb-4">
                    <h5 className="text-sm font-medium text-indigo-900 mb-3">添加处置记录</h5>
                    <div className="space-y-3">
                      <textarea
                        required
                        rows={2}
                        value={newRecord.content}
                        onChange={(e) => setNewRecord({...newRecord, content: e.target.value})}
                        placeholder="请输入处置内容..."
                        className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 text-sm"
                      />
                      <div className="flex items-center space-x-3">
                        <select
                          value={newRecord.newStatus}
                          onChange={(e) => setNewRecord({...newRecord, newStatus: e.target.value})}
                          className="border border-gray-300 rounded-md shadow-sm py-1.5 px-3 text-sm"
                        >
                          <option value="">保持当前状态</option>
                          <option value="handling">标记为处理中</option>
                          <option value="closed">标记为已关闭</option>
                        </select>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                        >
                          添加记录
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* 历史记录 */}
                <div className="space-y-3">
                  {selectedRisk.handling_records && selectedRisk.handling_records.length > 0 ? (
                    [...selectedRisk.handling_records].reverse().map((record, idx) => (
                      <div key={idx} className="flex space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-indigo-600" />
                          </div>
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {users.find(u => u.id === record.handler_id)?.full_name || '未知用户'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(record.date).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{record.content}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-4">暂无处置记录</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Risks;
