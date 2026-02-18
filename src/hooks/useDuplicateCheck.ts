/**
 * 查重Hook
 * 提供防抖查重功能
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '../lib/api';

export type DuplicateCheckType = 'project' | 'task' | 'supplier' | 'client';

export interface DuplicateCheckResult {
  exists: boolean;
  existingItem?: {
    id: string;
    name: string;
    createdAt: string;
  };
}

interface UseDuplicateCheckOptions {
  type: DuplicateCheckType;
  excludeId?: string;
  projectId?: string;
  debounceMs?: number;
}

export function useDuplicateCheck(options: UseDuplicateCheckOptions) {
  const { type, excludeId, projectId, debounceMs = 300 } = options;
  
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingItem, setExistingItem] = useState<DuplicateCheckResult['existingItem'] | null>(null);
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const checkDuplicate = useCallback(async (name: string) => {
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // 重置状态
    setIsDuplicate(false);
    setExistingItem(null);
    setError(null);
    
    // 空值不检查
    if (!name || name.trim().length === 0) {
      return;
    }
    
    // 设置防抖定时器
    debounceTimerRef.current = setTimeout(async () => {
      setIsChecking(true);
      
      try {
        const result = await apiClient.post<DuplicateCheckResult>('/api/duplicate-check', {
          type,
          name: name.trim(),
          excludeId,
          projectId,
        });
        
        setIsDuplicate(result.exists);
        setExistingItem(result.existingItem || null);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        }
      } finally {
        setIsChecking(false);
      }
    }, debounceMs);
  }, [type, excludeId, projectId, debounceMs]);

  // 清理函数
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    isDuplicate,
    isChecking,
    error,
    existingItem,
    checkDuplicate,
  };
}

export default useDuplicateCheck;
