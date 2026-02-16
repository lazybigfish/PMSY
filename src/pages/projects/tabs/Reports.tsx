
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../../lib/api';
import { Report } from '../../../types';
import { Loader2, Plus, FileText } from 'lucide-react';

interface ReportsProps {
  projectId: string;
}

const Reports: React.FC<ReportsProps> = ({ projectId }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'weekly' | 'daily'>('daily');

  useEffect(() => {
    fetchReports();
  }, [projectId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await api.db
        .from('reports')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />;

  const filteredReports = reports.filter(r => r.type === activeTab);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="border-b border-gray-200 flex-1 mr-4">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('daily')}
              className={`${
                activeTab === 'daily'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              项目日报
            </button>
            <button
              onClick={() => setActiveTab('weekly')}
              className={`${
                activeTab === 'weekly'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              项目周报
            </button>
          </nav>
        </div>
        <Link
          to={`/projects/${projectId}/reports/new?type=${activeTab}`}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          {activeTab === 'weekly' ? '新建周报' : '新建日报'}
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredReports.map((report) => (
            <li key={report.id}>
              <Link
                to={`/projects/${projectId}/reports/${report.id}`}
                className="block hover:bg-gray-50"
              >
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {report.title}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        report.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {report.status === 'published' ? '已发布' : '草稿'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        <FileText className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        {report.type === 'weekly' ? '周报' : '日报'}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>
                        创建时间：{' '}
                        <time dateTime={report.created_at}>
                          {new Date(report.created_at).toLocaleDateString()}
                        </time>
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
          {filteredReports.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500">
              暂无{activeTab === 'weekly' ? '周报' : '日报'}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Reports;
