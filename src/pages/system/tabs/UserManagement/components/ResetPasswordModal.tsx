/**
 * 重置密码弹窗组件
 */

import React, { useState } from 'react';
import { X, Loader2, Copy, Check } from 'lucide-react';
import { ResetPasswordMode } from '@/types/admin';
import { adminUserService } from '@/services/adminUserService';
import { Profile } from '@/types/user';
import { Modal } from '@/components/Modal';

interface ResetPasswordModalProps {
  user: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<ResetPasswordMode>('random');
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [forceChange, setForceChange] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !user) return null;

  const handleReset = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const result = await adminUserService.resetPassword(user.id, mode);
      setNewPassword(result.newPassword);
      
      // 如果开启了强制改密
      if (forceChange) {
        await adminUserService.setForcePasswordChange(user.id, true);
      }
      
      onSuccess();
    } catch (error) {
      // 错误已在 service 中处理
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setMode('random');
    setNewPassword(null);
    setForceChange(false);
    setCopied(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen && !!user}
      onClose={handleClose}
      title="重置密码"
      maxWidth="md"
    >
      <div className="space-y-4">
          {/* 用户信息 */}
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm text-gray-600">
              用户: <span className="font-medium text-gray-900">{user.username}</span>
            </p>
            <p className="text-sm text-gray-600">
              姓名: <span className="font-medium text-gray-900">{user.full_name || '-'}</span>
            </p>
          </div>

          {!newPassword ? (
            <>
              {/* 重置模式选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">重置模式</label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="resetMode"
                      value="random"
                      checked={mode === 'random'}
                      onChange={() => setMode('random')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">随机密码（系统生成强密码）</span>
                  </label>
                  <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="resetMode"
                      value="fixed"
                      checked={mode === 'fixed'}
                      onChange={() => setMode('fixed')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">固定密码（POP-101-ADA）</span>
                  </label>
                </div>
              </div>

              {/* 强制改密开关 */}
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <p className="text-sm font-medium text-gray-700">强制修改密码</p>
                  <p className="text-xs text-gray-500">开启后用户下次登录必须修改密码</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForceChange(!forceChange)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    forceChange ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      forceChange ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* 按钮 */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                  disabled={loading}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  确认重置
                </button>
              </div>
            </>
          ) : (
            <>
              {/* 显示新密码 */}
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <p className="text-sm text-green-800 mb-2">密码重置成功！</p>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border text-lg font-mono text-gray-800">
                    {newPassword}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="p-2 bg-white border rounded-md hover:bg-gray-50 text-gray-600"
                    title="复制密码"
                  >
                    {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
                {forceChange && (
                  <p className="text-xs text-green-700 mt-2">
                    已开启强制改密，用户下次登录必须修改密码
                  </p>
                )}
              </div>

              {/* 关闭按钮 */}
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  完成
                </button>
              </div>
            </>
          )}
      </div>
    </Modal>
  );
};

export default ResetPasswordModal;
