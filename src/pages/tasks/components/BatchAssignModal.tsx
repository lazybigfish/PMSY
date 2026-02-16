import React, { useState, useEffect } from 'react';
import { UserPlus, Check, Loader2, Search } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { Profile } from '../../../types';
import { api } from '../../../lib/api';
import { Avatar } from '../../../components/Avatar';

interface BatchAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskCount: number;
  projectId: string;
  onConfirm: (userIds: string[]) => Promise<void>;
}

export const BatchAssignModal: React.FC<BatchAssignModalProps> = ({
  isOpen,
  onClose,
  taskCount,
  projectId,
  onConfirm,
}) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 加载项目成员
  useEffect(() => {
    if (isOpen && projectId) {
      loadProjectMembers();
    }
  }, [isOpen, projectId]);

  const loadProjectMembers = async () => {
    setIsLoading(true);
    try {
      // 获取项目成员
      const { data: members } = await api.db
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId);

      if (members && members.length > 0) {
        const userIds = members.map((m: any) => m.user_id);
        // 获取用户信息
        const { data: profiles } = await api.db
          .from('profiles')
          .select('*')
          .in('id', userIds);

        setUsers(profiles || []);
      }
    } catch (error) {
      console.error('加载项目成员失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleConfirm = async () => {
    if (selectedUserIds.size === 0) return;
    setIsAssigning(true);
    try {
      await onConfirm(Array.from(selectedUserIds));
      onClose();
      setSelectedUserIds(new Set());
    } catch (error) {
      console.error('批量分配处理人失败:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6">
        {/* 标题 */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-dark-900 mb-1">批量分配处理人</h3>
          <p className="text-sm text-dark-500">
            为选中的 <span className="font-bold text-violet-600">{taskCount}</span> 个任务添加处理人
          </p>
        </div>

        {/* 搜索 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="搜索成员..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-dark-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all"
          />
        </div>

        {/* 用户列表 */}
        <div className="max-h-64 overflow-y-auto space-y-2 mb-6 border border-dark-100 rounded-xl p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-dark-500">
              {searchQuery ? '未找到匹配的成员' : '暂无项目成员'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => toggleUser(user.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  selectedUserIds.has(user.id)
                    ? 'bg-violet-50 border-2 border-violet-500'
                    : 'hover:bg-dark-50 border-2 border-transparent'
                }`}
              >
                {/* 头像 */}
                <Avatar
                  userId={user.id}
                  avatarUrl={user.avatar_url}
                  name={user.full_name}
                  email={user.email}
                  size="md"
                />

                {/* 信息 */}
                <div className="flex-1 text-left">
                  <p className="font-medium text-dark-900">{user.full_name || '未命名用户'}</p>
                  <p className="text-sm text-dark-500">{user.email}</p>
                </div>

                {/* 选中标记 */}
                {selectedUserIds.has(user.id) && (
                  <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* 已选择提示 */}
        {selectedUserIds.size > 0 && (
          <div className="mb-4 p-3 bg-violet-50 rounded-xl">
            <p className="text-sm text-violet-700">
              已选择 <span className="font-bold">{selectedUserIds.size}</span> 位处理人
            </p>
          </div>
        )}

        {/* 按钮 */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isAssigning}
            className="px-4 py-2 rounded-xl text-dark-700 font-medium hover:bg-dark-100 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedUserIds.size === 0 || isAssigning}
            className="px-4 py-2 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isAssigning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>分配中...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>确认分配</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
