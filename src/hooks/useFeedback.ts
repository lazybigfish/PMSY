/**
 * 优化与反馈功能 Hooks
 */

import { useState, useCallback, useEffect } from 'react';
import { feedbackService } from '../services/feedbackService';
import type {
  Feedback,
  FeedbackComment,
  FeedbackStatusHistory,
  CreateFeedbackRequest,
  HandleFeedbackRequest,
  UpdateFeedbackStatusRequest,
  CreateFeedbackCommentRequest,
  FeedbackListParams,
  FeedbackStats,
} from '../types/feedback';

/**
 * 反馈列表 Hook
 */
export function useFeedbackList(params: FeedbackListParams = {}) {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedbackList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await feedbackService.getFeedbackList(params);
      setFeedbackList(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取反馈列表失败');
    } finally {
      setLoading(false);
    }
  }, [params.status, params.type, params.page, params.pageSize]);

  useEffect(() => {
    fetchFeedbackList();
  }, [fetchFeedbackList]);

  return {
    feedbackList,
    total,
    loading,
    error,
    refresh: fetchFeedbackList,
  };
}

/**
 * 反馈统计 Hook
 */
export function useFeedbackStats() {
  const [stats, setStats] = useState<FeedbackStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await feedbackService.getFeedbackStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取统计失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refresh: fetchStats,
  };
}

/**
 * 反馈详情 Hook
 */
export function useFeedbackDetail(id: string | undefined) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await feedbackService.getFeedbackById(id);
      setFeedback(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取反馈详情失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleFeedback = useCallback(
    async (request: HandleFeedbackRequest) => {
      if (!id) return;
      try {
        const data = await feedbackService.handleFeedback(id, request);
        setFeedback(data);
        return data;
      } catch (err) {
        throw err;
      }
    },
    [id]
  );

  const updateStatus = useCallback(
    async (request: UpdateFeedbackStatusRequest) => {
      if (!id) return;
      try {
        const data = await feedbackService.updateFeedbackStatus(id, request);
        setFeedback(data);
        return data;
      } catch (err) {
        throw err;
      }
    },
    [id]
  );

  const deleteFeedback = useCallback(async () => {
    if (!id) return;
    try {
      await feedbackService.deleteFeedback(id);
    } catch (err) {
      throw err;
    }
  }, [id]);

  return {
    feedback,
    loading,
    error,
    refresh: fetchFeedback,
    handleFeedback,
    updateStatus,
    deleteFeedback,
  };
}

/**
 * 创建反馈 Hook
 */
export function useCreateFeedback() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createFeedback = useCallback(async (request: CreateFeedbackRequest) => {
    setLoading(true);
    setError(null);
    try {
      const data = await feedbackService.createFeedback(request);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建反馈失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    createFeedback,
    loading,
    error,
  };
}

/**
 * 反馈评论 Hook
 */
export function useFeedbackComments(feedbackId: string | undefined) {
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!feedbackId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await feedbackService.getFeedbackComments(feedbackId);
      setComments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取评论失败');
    } finally {
      setLoading(false);
    }
  }, [feedbackId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const createComment = useCallback(
    async (request: CreateFeedbackCommentRequest) => {
      if (!feedbackId) return;
      try {
        const data = await feedbackService.createFeedbackComment(
          feedbackId,
          request
        );
        setComments((prev) => [...prev, data]);
        return data;
      } catch (err) {
        throw err;
      }
    },
    [feedbackId]
  );

  const deleteComment = useCallback(async (commentId: string) => {
    try {
      await feedbackService.deleteFeedbackComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    comments,
    loading,
    error,
    refresh: fetchComments,
    createComment,
    deleteComment,
  };
}

/**
 * 反馈状态历史 Hook
 */
export function useFeedbackStatusHistory(feedbackId: string | undefined) {
  const [history, setHistory] = useState<FeedbackStatusHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!feedbackId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await feedbackService.getFeedbackStatusHistory(feedbackId);
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取状态历史失败');
    } finally {
      setLoading(false);
    }
  }, [feedbackId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    error,
    refresh: fetchHistory,
  };
}
