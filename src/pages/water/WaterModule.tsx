import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Waves, Flame, MessageSquare } from 'lucide-react';
import HotNewsTab from './HotNewsTab';
import ForumTab from './ForumTab';

export default function WaterModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'hotnews' | 'forum'>(
    tabFromUrl === 'forum' ? 'forum' : 'hotnews'
  );

  // 当 URL 参数变化时更新状态
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'forum' || tab === 'hotnews') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // 切换 Tab 时更新 URL
  const handleTabChange = (tab: 'hotnews' | 'forum') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Waves className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">水漫金山</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {activeTab === 'hotnews' 
                    ? '汇聚行业热点，掌握最新动态' 
                    : '分享经验，交流心得，共同成长'}
                </p>
              </div>
            </div>
          </div>

          {/* Tab 导航 */}
          <div className="flex gap-6 mt-6 border-b border-gray-200">
            <button
              onClick={() => handleTabChange('hotnews')}
              className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'hotnews'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Flame className="w-4 h-4" />
              热点资讯
            </button>
            <button
              onClick={() => handleTabChange('forum')}
              className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'forum'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              水底探宝
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'hotnews' ? <HotNewsTab /> : <ForumTab />}
      </div>
    </div>
  );
}
