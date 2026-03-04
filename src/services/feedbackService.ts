/**
 * 优化与反馈服务
 */

import { api } from '../lib/api';
import type {
  Feedback,
  FeedbackComment,
  FeedbackStatusHistory,
  CreateFeedbackRequest,
  HandleFeedbackRequest,
  UpdateFeedbackStatusRequest,
  CreateFeedbackCommentRequest,
  FeedbackListParams,
  FeedbackListResponse,
  FeedbackStats,
  FeedbackStatus,
} from '../types/feedback';

/**
 * 获取反馈列表
 */
export async function getFeedbackList(
  params: FeedbackListParams = {}
): Promise<FeedbackListResponse> {
  const { status, type, page = 1, pageSize = 20 } = params;

  let query = api.db.from('feedback').select('*');

  if (status) {
    query = query.eq('status', status);
  }

  if (type) {
    query = query.eq('type', type);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const result = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (result.error) {
    throw new Error(result.error.message || '获取反馈列表失败');
  }

  // 获取评论数量
  const feedbackIds = (result.data || []).map((f: Feedback) => f.id);
  let commentCounts: Record<string, number> = {};

  if (feedbackIds.length > 0) {
    const commentsResult = await api.db
      .from('feedback_comments')
      .select('feedback_id')
      .in('feedback_id', feedbackIds);

    commentCounts = (commentsResult.data || []).reduce(
      (acc: Record<string, number>, curr: { feedback_id: string }) => {
        acc[curr.feedback_id] = (acc[curr.feedback_id] || 0) + 1;
        return acc;
      },
      {}
    );
  }

  const feedbackWithCount = (result.data || []).map((f: Feedback) => ({
    ...f,
    comment_count: commentCounts[f.id] || 0,
  }));

  return {
    data: feedbackWithCount,
    total: (result.data || []).length,
    page,
    pageSize,
  };
}

/**
 * 获取反馈统计
 */
export async function getFeedbackStats(): Promise<FeedbackStats> {
  const result = await api.db.from('feedback').select('status');

  if (result.error) {
    throw new Error(result.error.message || '获取统计失败');
  }

  const stats = {
    total: result.data?.length || 0,
    pending: 0,
    processing: 0,
    completed: 0,
  };

  (result.data || []).forEach((item: { status: FeedbackStatus }) => {
    if (item.status === 'pending') {
      stats.pending++;
    } else if (
      ['accepted', 'developing', 'testing'].includes(item.status)
    ) {
      stats.processing++;
    } else if (['ready', 'completed', 'rejected'].includes(item.status)) {
      stats.completed++;
    }
  });

  return stats;
}

/**
 * 获取反馈详情
 */
export async function getFeedbackById(id: string): Promise<Feedback | null> {
  const result = await api.db
    .from('feedback')
    .select('*')
    .eq('id', id)
    .single();

  if (result.error) {
    throw new Error(result.error.message || '获取反馈详情失败');
  }

  return result.data;
}

/**
 * 创建反馈
 */
export async function createFeedback(
  request: CreateFeedbackRequest
): Promise<Feedback> {
  const result = await api.db
    .from('feedback')
    .insert({
      title: request.title,
      content: request.content,
      type: request.type,
      images: request.images || [],
      status: 'pending',
    })
    .select();

  if (result.error) {
    throw new Error(result.error.message || '创建反馈失败');
  }

  return (result.data || [])[0];
}

/**
 * 处理反馈（接受/拒绝）
 */
export async function handleFeedback(
  id: string,
  request: HandleFeedbackRequest
): Promise<Feedback> {
  const updateData: Record<string, unknown> = {
    handle_result: request.result,
    handle_remark: request.remark || null,
    handled_at: new Date().toISOString(),
  };

  if (request.result === 'accepted') {
    updateData.status = 'accepted';
  } else {
    updateData.status = 'rejected';
  }

  const result = await api.db
    .from('feedback')
    .update(updateData)
    .eq('id', id);

  if (result.error) {
    throw new Error(result.error.message || '处理反馈失败');
  }

  // 重新获取反馈详情
  const feedback = await getFeedbackById(id);
  if (!feedback) {
    throw new Error('反馈不存在');
  }
  return feedback;
}

/**
 * 更新反馈开发状态
 */
export async function updateFeedbackStatus(
  id: string,
  request: UpdateFeedbackStatusRequest
): Promise<Feedback> {
  const updateData: Record<string, unknown> = {
    status: request.status,
    dev_status_updated_at: new Date().toISOString(),
  };

  if (request.status === 'developing' || request.status === 'testing' || request.status === 'ready') {
    updateData.dev_status = request.status;
  }

  const result = await api.db
    .from('feedback')
    .update(updateData)
    .eq('id', id);

  if (result.error) {
    throw new Error(result.error.message || '更新状态失败');
  }

  // 重新获取反馈详情
  const feedback = await getFeedbackById(id);
  if (!feedback) {
    throw new Error('反馈不存在');
  }
  return feedback;
}

/**
 * 删除反馈
 */
export async function deleteFeedback(id: string): Promise<void> {
  const result = await api.db.from('feedback').delete().eq('id', id);

  if (result.error) {
    throw new Error(result.error.message || '删除反馈失败');
  }
}

/**
 * 获取评论列表
 */
export async function getFeedbackComments(
  feedbackId: string
): Promise<FeedbackComment[]> {
  const result = await api.db
    .from('feedback_comments')
    .select('*')
    .eq('feedback_id', feedbackId)
    .order('created_at', { ascending: true });

  if (result.error) {
    throw new Error(result.error.message || '获取评论失败');
  }

  return result.data || [];
}

/**
 * 创建评论
 */
export async function createFeedbackComment(
  feedbackId: string,
  request: CreateFeedbackCommentRequest
): Promise<FeedbackComment> {
  const result = await api.db
    .from('feedback_comments')
    .insert({
      feedback_id: feedbackId,
      content: request.content,
      reply_to: request.reply_to || null,
    })
    .select();

  if (result.error) {
    throw new Error(result.error.message || '创建评论失败');
  }

  return (result.data || [])[0];
}

/**
 * 删除评论
 */
export async function deleteFeedbackComment(id: string): Promise<void> {
  const result = await api.db
    .from('feedback_comments')
    .delete()
    .eq('id', id);

  if (result.error) {
    throw new Error(result.error.message || '删除评论失败');
  }
}

/**
 * 获取状态历史记录
 */
export async function getFeedbackStatusHistory(
  feedbackId: string
): Promise<FeedbackStatusHistory[]> {
  const result = await api.db
    .from('feedback_status_history')
    .select('*')
    .eq('feedback_id', feedbackId)
    .order('created_at', { ascending: true });

  if (result.error) {
    throw new Error(result.error.message || '获取状态历史失败');
  }

  return result.data || [];
}

// 导出服务对象
export const feedbackService = {
  getFeedbackList,
  getFeedbackStats,
  getFeedbackById,
  createFeedback,
  handleFeedback,
  updateFeedbackStatus,
  deleteFeedback,
  getFeedbackComments,
  createFeedbackComment,
  deleteFeedbackComment,
  getFeedbackStatusHistory,
};
