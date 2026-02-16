import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { notificationService } from '../services';
import { useAuth } from '../context/AuthContextNew';
import { Notification } from '../types';
import * as Popover from '@radix-ui/react-popover';

export const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    try {
      if (!user?.id) return;
      
      const data = await notificationService.getNotifications(user.id);
      
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user?.id]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (!user?.id) return;
      
      await notificationService.markAllAsRead(user.id);
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full focus:outline-none">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50 mr-4 mt-2" align="end" sideOffset={5}>
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllAsRead} className="text-xs text-indigo-600 hover:text-indigo-800">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">No notifications</div>
            ) : (
              notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-blue-50/50' : ''}`}
                  onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {notification.title}
                    </p>
                    {!notification.is_read && <span className="h-2 w-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />}
                  </div>
                  {notification.content && <p className="text-xs text-gray-500 mb-1">{notification.content}</p>}
                  <span className="text-xs text-gray-400 block">{new Date(notification.created_at).toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
