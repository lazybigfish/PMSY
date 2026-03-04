/**
 * 优化与反馈功能类型定义
 */

// 反馈类型
export type FeedbackType = 'bug' | 'feature' | 'improvement' | 'other';

// 反馈类型标签
export const FeedbackTypeLabels: Record<FeedbackType, string> = {
  bug: '问题反馈',
  feature: '新需求',
  improvement: '优化建议',
  other: '其他',
};

// 反馈状态
export type FeedbackStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'developing'
  | 'testing'
  | 'ready'
  | 'completed';

// 反馈状态标签和颜色
export const FeedbackStatusConfig: Record<
  FeedbackStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  pending: {
    label: '待处理',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-200',
  },
  accepted: {
    label: '已接受',
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    border: 'border-orange-200',
  },
  rejected: {
    label: '已拒绝',
    bg: 'bg-red-100',
    text: 'text-red-600',
    border: 'border-red-200',
  },
  developing: {
    label: '开发中',
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    border: 'border-orange-200',
  },
  testing: {
    label: '测试中',
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    border: 'border-orange-200',
  },
  ready: {
    label: '待发版',
    bg: 'bg-green-100',
    text: 'text-green-600',
    border: 'border-green-200',
  },
  completed: {
    label: '已完成',
    bg: 'bg-green-100',
    text: 'text-green-600',
    border: 'border-green-200',
  },
};

// 开发状态
export type DevStatus = 'developing' | 'testing' | 'ready';

// 开发状态标签
export const DevStatusLabels: Record<DevStatus, string> = {
  developing: '开发中',
  testing: '测试中',
  ready: '待发版',
};

// 反馈记录
export interface Feedback {
  id: string;
  title: string;
  content: string;
  type: FeedbackType;
  images: string[];
  status: FeedbackStatus;

  // 提交人信息
  created_by: string;
  created_by_name: string;
  created_at: string;

  // 处理信息
  handled_by?: string;
  handled_by_name?: string;
  handled_at?: string;
  handle_result?: 'accepted' | 'rejected';
  handle_remark?: string;

  // 开发进度
  dev_status?: DevStatus;
  dev_status_updated_at?: string;
  dev_status_updated_by?: string;

  updated_at: string;

  // 关联数据
  comment_count?: number;
}

// 反馈评论
export interface FeedbackComment {
  id: string;
  feedback_id: string;
  content: string;

  // 评论人信息
  created_by: string;
  created_by_name: string;
  created_by_avatar?: string;
  created_at: string;

  // 回复功能
  reply_to?: string;
  reply_to_name?: string;

  updated_at: string;
}

// 创建反馈请求
export interface CreateFeedbackRequest {
  title: string;
  content: string;
  type: FeedbackType;
  images?: string[];
}

// 处理反馈请求
export interface HandleFeedbackRequest {
  result: 'accepted' | 'rejected';
  remark?: string;
}

// 更新开发状态请求
export interface UpdateFeedbackStatusRequest {
  status: FeedbackStatus;
  remark?: string;
}

// 创建评论请求
export interface CreateFeedbackCommentRequest {
  content: string;
  reply_to?: string;
}

// 反馈列表查询参数
export interface FeedbackListParams {
  status?: FeedbackStatus;
  type?: FeedbackType;
  page?: number;
  pageSize?: number;
}

// 反馈列表响应
export interface FeedbackListResponse {
  data: Feedback[];
  total: number;
  page: number;
  pageSize: number;
}

// 反馈统计
export interface FeedbackStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
}

// 状态历史记录
export interface FeedbackStatusHistory {
  id: string;
  feedback_id: string;
  from_status?: FeedbackStatus;
  to_status: FeedbackStatus;
  remark?: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
}
