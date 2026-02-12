import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Download } from 'lucide-react';

interface StatsItem {
  name: string;
  value: number;
}

export default function AnalysisDashboard() {
  const [projectStats, setProjectStats] = useState<StatsItem[]>([]);
  const [taskStats, setTaskStats] = useState<StatsItem[]>([]);
  const [riskStats, setRiskStats] = useState<StatsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch Projects
      const { data: projects } = await supabase.from('projects').select('status');
      const pStats = processProjectStats(projects || []);
      setProjectStats(pStats);

      // Fetch Tasks
      const { data: tasks } = await supabase.from('tasks').select('status, priority');
      const tStats = processTaskStats(tasks || []);
      setTaskStats(tStats);

      // Fetch Risks
      const { data: risks } = await supabase.from('risks').select('level');
      const rStats = processRiskStats(risks || []);
      setRiskStats(rStats);

    } catch (error) {
      console.error('Error fetching analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processProjectStats = (data: { status: string }[]) => {
    const counts: Record<string, number> = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      paused: 0
    };
    data.forEach(item => {
      if (counts[item.status] !== undefined) counts[item.status]++;
    });
    
    const map: Record<string, string> = {
      pending: '未开始',
      in_progress: '进行中',
      completed: '已完成',
      paused: '已暂停'
    };

    return Object.keys(counts).map(key => ({
      name: map[key],
      value: counts[key]
    }));
  };

  const processTaskStats = (data: { status: string }[]) => {
    const counts: Record<string, number> = {
      todo: 0,
      in_progress: 0,
      done: 0,
      paused: 0
    };
    data.forEach(item => {
      const status = item.status === 'canceled' ? 'paused' : item.status; // Group canceled with paused for simplicity or ignore
      if (counts[status] !== undefined) counts[status]++;
    });

    const map: Record<string, string> = {
      todo: '待办',
      in_progress: '进行中',
      done: '已完成',
      paused: '挂起/取消'
    };

    return Object.keys(counts).map(key => ({
      name: map[key],
      value: counts[key]
    }));
  };

  const processRiskStats = (data: { level: string }[]) => {
    const counts: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0
    };
    data.forEach(item => {
      if (counts[item.level] !== undefined) counts[item.level]++;
    });

    const map: Record<string, string> = {
      low: '低风险',
      medium: '中风险',
      high: '高风险'
    };

    return Object.keys(counts).map(key => ({
      name: map[key],
      value: counts[key]
    }));
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
  const RISK_COLORS = ['#4ade80', '#facc15', '#ef4444'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">统计分析</h1>
        <button className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm">
          <Download className="w-4 h-4 mr-2" />
          导出报表
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Project Status Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">项目状态分布</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={projectStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {projectStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Status Overview */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">任务状态概览</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="任务数量" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Level Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">风险等级分布</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="风险数量" fill="#f87171">
                  {riskStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Completion Trend (Mock for now, as we need historical data) */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">本周任务完成趋势</h3>
          <div className="h-80 flex items-center justify-center text-gray-400">
             <div className="text-center">
               <p>需要更多历史数据以生成趋势图</p>
               <p className="text-sm mt-2">（目前仅展示当前快照数据）</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
