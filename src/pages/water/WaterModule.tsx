import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Waves, MessageSquare } from 'lucide-react';
import ForumTab from './ForumTab';

export default function WaterModule() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  // 暂时只开放水底探宝，默认显示 forum
  const [activeTab, setActiveTab] = useState<'forum'>(
    'forum'
  );

  // 当 URL 参数变化时更新状态
  useEffect(() => {
    const tab = searchParams.get('tab');
    // 暂时只支持 forum
    if (tab === 'forum') {
      setActiveTab(tab);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Waves className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">水漫金山</h1>
                <p className="text-sm text-gray-500 mt-1">
                  分享经验，交流心得，共同成长
                </p>
              </div>
            </div>
          </div>

          {/* Tab 导航 - 暂时只显示水底探宝 */}
          <div className="flex gap-6 mt-6 border-b border-gray-200">
            <button
              className="flex items-center gap-2 pb-3 text-sm font-medium transition-all duration-200 ease-out border-b-2 rounded-t-lg px-3 -mb-px border-blue-500 text-blue-600 bg-blue-50/50"
            >
              <MessageSquare className="w-4 h-4" />
              水底探宝
            </button>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ForumTab />
      </div>
    </div>
  );
}
