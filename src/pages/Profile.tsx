import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContextNew';
import { User, Mail, Shield, Calendar, Edit2, Save, X, Lock, Eye, EyeOff, Camera } from 'lucide-react';
import { Profile } from '../types';
import { ModalForm } from '../components/Modal';
import { AvatarSelector } from '../components/AvatarSelector';
import { generateDefaultAvatar } from '../lib/avatarGenerator';

const ProfilePage: React.FC = () => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // 修改密码相关状态
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [changingPassword, setChangingPassword] = useState(false);
  
  // 头像选择相关状态
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }

    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
      });
      // 如果没有头像，生成默认头像
      if (!profile.avatar_url && user?.id) {
        setAvatarUrl(generateDefaultAvatar(user.id));
      } else {
        setAvatarUrl(profile.avatar_url);
      }
    }
    setLoading(false);
  }, [user, profile, authLoading, navigate]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      await api.auth.updateUser({
        full_name: formData.full_name,
        phone: formData.phone,
        avatar_url: avatarUrl,
      });

      // 刷新用户信息
      await refreshProfile();

      setIsEditing(false);
      alert('个人信息更新成功');
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      const err = error as Error;
      alert('更新失败: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
      });
    }
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    if (!user) return;
    
    // 验证密码
    if (passwordData.newPassword.length < 6) {
      alert('新密码长度至少6位');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('两次输入的新密码不一致');
      return;
    }

    setChangingPassword(true);
    try {
      await api.auth.updatePassword(passwordData.currentPassword, passwordData.newPassword);
      
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      alert('密码修改成功，请使用新密码登录');
    } catch (error: unknown) {
      console.error('Error changing password:', error);
      const err = error as Error;
      alert('密码修改失败: ' + err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">个人信息</h1>
          <p className="mt-1 text-sm text-gray-500">管理您的账户信息</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              编辑资料
            </button>
          )}
          <button
            onClick={() => setShowPasswordModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Lock className="h-4 w-4 mr-2" />
            修改密码
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-indigo-600">
          <div className="flex items-center">
            <div className="relative group">
              <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
                ) : (
                  <User className="h-10 w-10 text-indigo-600" />
                )}
              </div>
              {/* 更换头像按钮 */}
              <button
                onClick={() => setShowAvatarSelector(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="更换头像"
              >
                <Camera className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="ml-6">
              <h3 className="text-lg leading-6 font-medium text-white">
                {profile?.full_name || profile?.username || '用户'}
              </h3>
              <p className="mt-1 text-sm text-indigo-200">
                {profile?.role === 'admin' ? '管理员' : profile?.role === 'manager' || profile?.role === 'project_manager' ? '项目经理' : '普通用户'}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-6">
            {/* 用户名 - 只读 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <User className="h-4 w-4 mr-2 text-gray-400" />
                用户名
              </label>
              <p className="mt-1 text-sm text-gray-900">{profile?.username || '-'}</p>
              <p className="mt-1 text-xs text-gray-500">用户名不可修改</p>
            </div>

            {/* 姓名 - 可编辑 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <Shield className="h-4 w-4 mr-2 text-gray-400" />
                姓名
              </label>
              {isEditing ? (
                <input
                  type="text"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.full_name || ''}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="请输入姓名"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{profile?.full_name || '-'}</p>
              )}
            </div>

            {/* 邮箱 - 只读 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                邮箱
              </label>
              <p className="mt-1 text-sm text-gray-900">{user?.email || '-'}</p>
              <p className="mt-1 text-xs text-gray-500">邮箱不可修改</p>
            </div>

            {/* 电话 - 可编辑 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">电话</label>
              {isEditing ? (
                <input
                  type="tel"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="请输入电话号码"
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{profile?.phone || '-'}</p>
              )}
            </div>

            {/* 个人简介 - 可编辑 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">个人简介</label>
              {isEditing ? (
                <textarea
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  rows={3}
                  value={formData.bio || ''}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="介绍一下自己..."
                />
              ) : (
                <p className="mt-1 text-sm text-gray-900">{profile?.bio || '-'}</p>
              )}
            </div>

            {/* 角色 - 只读 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">角色</label>
              <p className="mt-1 text-sm text-gray-900">
                {profile?.role === 'admin' ? '管理员' : profile?.role === 'manager' || profile?.role === 'project_manager' ? '项目经理' : '普通用户'}
              </p>
              <p className="mt-1 text-xs text-gray-500">角色不可自行修改</p>
            </div>

            {/* 创建时间 - 只读 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                账户创建时间
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {profile?.created_at ? new Date(profile.created_at).toLocaleString('zh-CN') : '-'}
              </p>
            </div>
          </div>

          {/* 编辑操作按钮 */}
          {isEditing && (
            <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleCancel}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                取消
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                disabled={saving}
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                保存
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 头像选择器 */}
      {user?.id && (
        <AvatarSelector
          isOpen={showAvatarSelector}
          onClose={() => setShowAvatarSelector(false)}
          onSelect={(url) => setAvatarUrl(url)}
          currentAvatar={avatarUrl}
          userId={user.id}
        />
      )}

      {/* 修改密码弹窗 */}
      <ModalForm
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        }}
        onSubmit={handleChangePassword}
        title="修改密码"
        maxWidth="md"
        isSubmitting={changingPassword}
        submitDisabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
      >
        <div className="space-y-4">
          {/* 当前密码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              当前密码
            </label>
            <div className="relative">
              <input
                type={showPassword.current ? 'text' : 'password'}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                placeholder="请输入当前密码"
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword.current ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* 新密码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              新密码
            </label>
            <div className="relative">
              <input
                type={showPassword.new ? 'text' : 'password'}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                placeholder="请输入新密码（至少6位）"
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword.new ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          {/* 确认新密码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              确认新密码
            </label>
            <div className="relative">
              <input
                type={showPassword.confirm ? 'text' : 'password'}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 pr-10 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="请再次输入新密码"
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword.confirm ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </ModalForm>
    </div>
  );
};

export default ProfilePage;
