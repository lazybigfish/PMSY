/**
 * 用户管理模块
 * 功能：用户列表、新增用户、编辑用户、重置密码、禁用/启用用户
 */

import React, { useEffect, useState } from 'react';
import { Search, Plus, Trash2, Edit2, X, Loader2, Key } from 'lucide-react';
import { userService, roleService } from '@/services';
import { adminUserService } from '@/services/adminUserService';
import { Profile, AppRole } from '@/types';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { ModalForm } from '@/components/Modal';
import { Avatar } from '@/components/Avatar';

export default function UserManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roles, setRoles] = useState<AppRole[]>([]);

  // 新增/编辑用户弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role: 'user',
    is_active: true,
  });

  // 重置密码弹窗状态
  const [resetPasswordUser, setResetPasswordUser] = useState<Profile | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const data = await roleService.getRoles();
      if (data && data.length > 0) {
        setRoles(data);
      }
    } catch (err) {
      console.warn('Error fetching roles:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // 打开新增用户弹窗
  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setEditingUser(null);
    setFormData({
      username: '',
      full_name: '',
      email: '',
      password: 'POP-101-ada',
      role: 'user',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  // 打开编辑用户弹窗
  const handleOpenEditModal = (user: Profile) => {
    setIsEditMode(true);
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      full_name: user.full_name || '',
      email: user.email || '',
      password: '', // 编辑时不显示密码
      role: user.role || 'user',
      is_active: user.is_active !== false,
    });
    setIsModalOpen(true);
  };

  // 关闭弹窗
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormData({
      username: '',
      full_name: '',
      email: '',
      password: '',
      role: 'user',
      is_active: true,
    });
  };

  // 提交表单（新增/编辑）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditMode && editingUser) {
      // 编辑模式
      if (!formData.full_name) {
        alert('请输入姓名');
        return;
      }

      try {
        setSubmitting(true);
        await adminUserService.updateUser(editingUser.id, {
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role,
          is_active: formData.is_active,
        });
        handleCloseModal();
        fetchUsers();
      } catch (error) {
        // 错误已在 service 中处理
      } finally {
        setSubmitting(false);
      }
    } else {
      // 新增模式
      if (!formData.username || !formData.password) {
        alert('请输入用户名和密码');
        return;
      }

      try {
        setSubmitting(true);
        // 如果用户填写了邮箱则使用，否则根据用户名自动生成
        const email = formData.email || `${formData.username}@pmsy.com`;
        await adminUserService.createUser({
          username: formData.username,
          full_name: formData.full_name,
          email: email,
          password: formData.password,
          role: formData.role,
        });
        handleCloseModal();
        fetchUsers();
      } catch (error) {
        // 错误已在 service 中处理
      } finally {
        setSubmitting(false);
      }
    }
  };

  // 打开重置密码弹窗
  const handleOpenResetModal = (user: Profile) => {
    setResetPasswordUser(user);
    setIsResetModalOpen(true);
  };

  // 关闭重置密码弹窗
  const handleCloseResetModal = () => {
    setIsResetModalOpen(false);
    setResetPasswordUser(null);
  };

  // 禁用/启用用户
  const handleToggleStatus = async (user: Profile) => {
    const newStatus = user.is_active === false;
    const action = newStatus ? '启用' : '禁用';

    if (!confirm(`确定要${action}用户 "${user.username}" 吗？`)) {
      return;
    }

    try {
      await adminUserService.toggleUserStatus(user.id, newStatus);
      fetchUsers();
    } catch (error) {
      // 错误已在 service 中处理
    }
  };

  // 获取角色显示名称
  const getRoleDisplayName = (roleKey: string) => {
    const role = roles.find(r => r.key === roleKey);
    return role?.name || roleKey;
  };

  // 过滤用户列表
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">用户管理</h2>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          新增用户
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="搜索用户名、姓名或邮箱..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  暂无用户数据
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className={user.is_active === false ? 'bg-gray-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar
                        userId={user.id}
                        avatarUrl={user.avatar_url}
                        name={user.full_name || user.username}
                        size="md"
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name || user.username}
                          {user.is_active === false && (
                            <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              已禁用
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {getRoleDisplayName(user.role || 'user')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.is_active !== false
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.is_active !== false ? '正常' : '已禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="text-indigo-600 hover:text-indigo-900 p-1"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenResetModal(user)}
                        className="text-amber-600 hover:text-amber-900 p-1"
                        title="重置密码"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`p-1 ${
                          user.is_active !== false
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                        }`}
                        title={user.is_active !== false ? '禁用' : '启用'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit User Modal */}
      <ModalForm
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        title={isEditMode ? '编辑用户' : '新增用户'}
        maxWidth="md"
        isSubmitting={submitting}
      >
        <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名 {isEditMode ? '' : <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  required={!isEditMode}
                  disabled={isEditMode}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  placeholder="登录账号 (如: zhangsan)"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                />
                {isEditMode && (
                  <p className="text-xs text-gray-500 mt-1">用户名不可修改</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="显示名称 (如: 张三)"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              {!isEditMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    密码 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="默认密码: POP-101-ada"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                  <p className="text-xs text-gray-500 mt-1">默认密码为 POP-101-ada，可自行修改</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="用户邮箱"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                >
                  {roles.length > 0 ? (
                    roles.map(r => (
                      <option key={r.key} value={r.key}>{r.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="user">普通用户</option>
                      <option value="manager">项目经理</option>
                      <option value="admin">管理员</option>
                    </>
                  )}
                </select>
              </div>

              {isEditMode && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    启用账号
                  </label>
                </div>
              )}

        </div>
      </ModalForm>

      {/* Reset Password Modal */}
      <ResetPasswordModal
        user={resetPasswordUser}
        isOpen={isResetModalOpen}
        onClose={handleCloseResetModal}
        onSuccess={() => {}}
      />
    </div>
  );
}
