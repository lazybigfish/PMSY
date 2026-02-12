import { supabase } from '../lib/supabase';
import {
  FileRecord,
  FileCategory,
  StorageQuota,
  FileUploadProgress,
  ALLOWED_EXTENSIONS,
  DEFAULT_MAX_FILE_SIZE,
  getCategoryFromFile,
  getExtension,
  formatFileSize,
} from '../types/file';

// 文件服务类
class FileService {
  // 获取存储配置
  async getStorageConfigs() {
    const { data, error } = await supabase
      .from('storage_configs')
      .select('*')
      .eq('status', 'active')
      .order('is_default', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // 获取默认存储配置
  async getDefaultStorageConfig() {
    const { data, error } = await supabase
      .from('storage_configs')
      .select('*')
      .eq('is_default', true)
      .eq('status', 'active')
      .single();

    if (error) throw error;
    return data;
  }

  // 获取文件列表
  async getFiles(options: {
    folderId?: string | null;
    category?: FileCategory | null;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}) {
    const { folderId = null, category = null, search = '', page = 0, pageSize = 20 } = options;

    let query = supabase
      .from('files')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .is('parent_id', folderId)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await query
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw error;

    return {
      files: data || [],
      total: count || 0,
      page,
      pageSize,
    };
  }

  // 获取文件夹列表
  async getFolders(parentId: string | null = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('owner_id', user.id)
      .is('parent_id', parentId)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  // 创建文件夹
  async createFolder(name: string, parentId: string | null = null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 构建路径
    let path = name;
    if (parentId) {
      const { data: parent } = await supabase
        .from('folders')
        .select('path')
        .eq('id', parentId)
        .single();
      if (parent) {
        path = `${parent.path}/${name}`;
      }
    }

    const { data, error } = await supabase
      .from('folders')
      .insert({
        name,
        parent_id: parentId,
        path,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // 验证文件
  validateFile(file: File, maxSize: number = DEFAULT_MAX_FILE_SIZE): { valid: boolean; error?: string } {
    // 检查文件大小
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `文件大小超过限制，最大允许 ${formatFileSize(maxSize)}`,
      };
    }

    // 检查文件扩展名
    const ext = getExtension(file.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `不支持的文件格式: ${ext}`,
      };
    }

    return { valid: true };
  }

  // 上传文件（单文件）
  async uploadFile(
    file: File,
    folderId?: string | null,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<FileRecord> {
    // folderId and onProgress are reserved for future use
    void folderId;
    void onProgress;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 验证文件
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 获取存储配额
    const quota = await this.getStorageQuota(user.id);
    if (quota.used_quota + file.size > quota.total_quota) {
      throw new Error('存储空间不足');
    }

    // 获取默认存储配置
    const storageConfig = await this.getDefaultStorageConfig();

    // 生成唯一文件名
    const ext = getExtension(file.name);
    const timestamp = Date.now();
    const uniqueName = `${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;

    // 构建存储路径
    const date = new Date();
    const folderPath = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
    const storagePath = `${folderPath}/${uniqueName}`;

    // 上传文件到 Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // 获取文件URL
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(storagePath);

    // 保存文件元数据
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert({
        name: uniqueName,
        original_name: file.name,
        mime_type: file.type,
        size: file.size,
        extension: ext,
        storage_type: storageConfig.type,
        storage_path: storagePath,
        storage_config_id: storageConfig.id,
        url: publicUrl,
        category: getCategoryFromFile(file),
        uploader_id: user.id,
        version: 1,
        is_latest: true,
      })
      .select()
      .single();

    if (dbError) {
      // 如果数据库插入失败，删除已上传的文件
      await supabase.storage.from('files').remove([storagePath]);
      throw dbError;
    }

    // 更新存储配额
    await this.updateStorageQuota(user.id, file.size, 1);

    // 记录操作日志
    await this.logOperation('upload', fileRecord.id, file.name);

    return fileRecord;
  }

  // 上传多个文件
  async uploadMultipleFiles(
    files: File[],
    folderId: string | null = null,
    onProgress?: (progress: FileUploadProgress[]) => void
  ): Promise<FileRecord[]> {
    const results: FileRecord[] = [];
    const progressList: FileUploadProgress[] = files.map((file, index) => ({
      fileId: `temp_${index}`,
      fileName: file.name,
      progress: 0,
      status: 'pending',
    }));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progressList[i].status = 'uploading';
      onProgress?.([...progressList]);

      try {
        const result = await this.uploadFile(file, folderId);
        results.push(result);
        progressList[i].status = 'completed';
        progressList[i].result = result;
        progressList[i].progress = 100;
      } catch (error) {
        progressList[i].status = 'error';
        progressList[i].error = error instanceof Error ? error.message : 'Upload failed';
      }

      onProgress?.([...progressList]);
    }

    return results;
  }

  // 删除文件
  async deleteFile(fileId: string, permanent: boolean = false) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError) throw fetchError;
    if (!file) throw new Error('File not found');

    if (permanent) {
      // 永久删除
      // 从存储中删除文件
      await supabase.storage.from('files').remove([file.storage_path]);

      // 从数据库中删除记录
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;

      // 更新存储配额
      await this.updateStorageQuota(user.id, -file.size, -1);
    } else {
      // 软删除
      const { error } = await supabase
        .from('files')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
        .eq('id', fileId);

      if (error) throw error;
    }

    // 记录操作日志
    await this.logOperation('delete', fileId, file.name);
  }

  // 重命名文件
  async renameFile(fileId: string, newName: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError) throw fetchError;
    if (!file) throw new Error('File not found');

    const oldName = file.name;

    const { error } = await supabase
      .from('files')
      .update({ name: newName })
      .eq('id', fileId);

    if (error) throw error;

    // 记录操作日志
    await this.logOperation('rename', fileId, newName, { name: oldName }, { name: newName });
  }

  // 移动文件
  async moveFile(fileId: string, targetFolderId: string | null) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError) throw fetchError;
    if (!file) throw new Error('File not found');

    const oldFolderId = file.parent_id;

    const { error } = await supabase
      .from('files')
      .update({ parent_id: targetFolderId })
      .eq('id', fileId);

    if (error) throw error;

    // 记录操作日志
    await this.logOperation('move', fileId, file.name, { parent_id: oldFolderId }, { parent_id: targetFolderId });
  }

  // 获取存储配额
  async getStorageQuota(userId: string): Promise<StorageQuota> {
    const { data, error } = await supabase
      .from('storage_quotas')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // 如果不存在，创建默认配额
      const { data: newQuota, error: createError } = await supabase
        .from('storage_quotas')
        .insert({ user_id: userId })
        .select()
        .single();

      if (createError) throw createError;
      return newQuota;
    }

    return data;
  }

  // 更新存储配额
  private async updateStorageQuota(userId: string, sizeDelta: number, countDelta: number) {
    const { data: quota } = await supabase
      .from('storage_quotas')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (quota) {
      await supabase
        .from('storage_quotas')
        .update({
          used_quota: Math.max(0, quota.used_quota + sizeDelta),
          file_count: Math.max(0, quota.file_count + countDelta),
        })
        .eq('user_id', userId);
    }
  }

  // 记录操作日志
  private async logOperation(
    operationType: string,
    fileId: string,
    fileName: string,
    oldValue?: unknown,
    newValue?: unknown
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    await supabase.from('file_operation_logs').insert({
      operation_type: operationType,
      file_id: fileId,
      file_name: fileName,
      operator_id: user.id,
      operator_name: profile?.full_name || 'Unknown',
      old_value: oldValue,
      new_value: newValue,
    });
  }

  // 获取文件统计
  async getFileStats(userId: string) {
    // 按分类统计 - 使用原始查询
    const { data: categoryStats, error: catError } = await supabase
      .from('files')
      .select('category, size')
      .eq('uploader_id', userId)
      .eq('status', 'active');

    if (catError) throw catError;
    
    // 手动统计分类数据
    const statsMap = new Map<string, { count: number; totalSize: number }>();
    (categoryStats || []).forEach((file: { category?: string; size?: number }) => {
      const cat = file.category || 'other';
      const current = statsMap.get(cat) || { count: 0, totalSize: 0 };
      current.count++;
      current.totalSize += file.size || 0;
      statsMap.set(cat, current);
    });
    const formattedCategoryStats = Array.from(statsMap.entries()).map(([category, stats]) => ({
      category,
      count: stats.count,
      total_size: stats.totalSize,
    }));

    // 最近上传的文件
    const { data: recentFiles, error: recentError } = await supabase
      .from('files')
      .select('*')
      .eq('uploader_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) throw recentError;

    return {
      categoryStats: formattedCategoryStats,
      recentFiles: recentFiles || [],
    };
  }

  // 更新文件关联信息
  async updateFileContext(
    fileId: string,
    context: {
      projectId?: string;
      taskId?: string;
      moduleType?: string;
      description?: string;
    }
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const updateData: Record<string, string | undefined> = {};
    if (context.projectId) updateData.project_id = context.projectId;
    if (context.taskId) updateData.task_id = context.taskId;
    if (context.moduleType) updateData.module_type = context.moduleType;
    if (context.description) updateData.description = context.description;

    const { error } = await supabase
      .from('files')
      .update(updateData)
      .eq('id', fileId);

    if (error) throw error;
  }

  // 获取项目的附件列表
  async getProjectFiles(projectId: string) {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // 获取任务的附件列表
  async getTaskFiles(taskId: string) {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('task_id', taskId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // 获取模块类型的文件列表
  async getFilesByModuleType(moduleType: string, projectId?: string) {
    let query = supabase
      .from('files')
      .select('*')
      .eq('module_type', moduleType)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
}

export const fileService = new FileService();
