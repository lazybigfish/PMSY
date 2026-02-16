import { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Folder,
  File,
  Image,
  Video,
  Music,
  FileText,
  Archive,
  MoreVertical,
  Trash2,
  Download,
  Search,
  Grid,
  List,
  ChevronRight,
  Home,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { fileService } from '../../services/fileService';
import { FileRecord, Folder as FolderType, FileCategory, FileUploadProgress } from '../../types/file';
import { useAuth } from '../../context/AuthContextNew';
import { format } from 'date-fns';
import { Modal } from '../../components/Modal';

const categoryIcons: Record<FileCategory, React.ReactNode> = {
  document: <FileText className="w-5 h-5" />,
  image: <Image className="w-5 h-5" />,
  video: <Video className="w-5 h-5" />,
  audio: <Music className="w-5 h-5" />,
  archive: <Archive className="w-5 h-5" />,
  other: <File className="w-5 h-5" />,
};

const categoryColors: Record<FileCategory, string> = {
  document: 'text-blue-500 bg-blue-50',
  image: 'text-green-500 bg-green-50',
  video: 'text-red-500 bg-red-50',
  audio: 'text-purple-500 bg-purple-50',
  archive: 'text-orange-500 bg-orange-50',
  other: 'text-gray-500 bg-gray-50',
};

export default function FileManager() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory] = useState<FileCategory | null>(null);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; file: FileRecord } | null>(null);
  const [quota, setQuota] = useState({ total: 0, used: 0, available: 0 });

  // 加载文件和文件夹
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [filesResult, foldersResult, quotaResult] = await Promise.all([
        fileService.getFiles({
          folderId: currentFolder,
          category: selectedCategory,
          search: searchQuery,
        }),
        fileService.getFolders(currentFolder),
        user ? fileService.getStorageQuota() : Promise.resolve({ total: 0, used: 0 }),
      ]);

      setFiles(filesResult.files);
      setFolders(foldersResult);
      setQuota({
        total: quotaResult.total,
        used: quotaResult.used,
        available: quotaResult.total - quotaResult.used,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentFolder, selectedCategory, searchQuery, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setShowUploadModal(true);

    try {
      const fileArray = Array.from(files);
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        await fileService.uploadFile(
          file,
          currentFolder,
          (progress) => {
            setUploadProgress(prev => {
              const newProgress = [...prev];
              newProgress[i] = {
                fileId: file.name,
                fileName: file.name,
                progress: progress.progress,
                status: progress.progress === 100 ? 'completed' : 'uploading',
              };
              return newProgress;
            });
          }
        );
      }

      // 刷新文件列表
      await loadData();

      // 延迟关闭上传弹窗
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadProgress([]);
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  // 格式化文件大小
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 处理文件选择
  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, file: FileRecord) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  // 删除文件
  const handleDelete = async (fileId: string) => {
    if (!confirm('确定要删除这个文件吗？')) return;

    try {
      await fileService.deleteFile(fileId);
      await loadData();
    } catch (error) {
      console.error('Delete error:', error);
      alert('删除失败');
    }
  };

  // 下载文件
  const handleDownload = (file: FileRecord) => {
    if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  // 导航到文件夹
  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolder(folderId);
    setSelectedFiles(new Set());
  };

  // 渲染面包屑
  const renderBreadcrumb = () => (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <button
        onClick={() => navigateToFolder(null)}
        className="flex items-center gap-1 hover:text-blue-600"
      >
        <Home className="w-4 h-4" />
        首页
      </button>
      {folderPath.map((folder) => (
        <div key={folder.id} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4" />
          <button
            onClick={() => navigateToFolder(folder.id)}
            className="hover:text-blue-600"
          >
            {folder.name}
          </button>
        </div>
      ))}
    </div>
  );

  // 渲染文件列表
  const renderFileList = () => {
    if (loading) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      );
    }

    if (files.length === 0 && folders.length === 0) {
      return (
        <div className="text-center py-12">
          <Folder className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">暂无文件</p>
          <p className="text-sm text-gray-400 mt-1">点击上传按钮添加文件</p>
        </div>
      );
    }

    return viewMode === 'list' ? (
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedFiles.size === files.length && files.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedFiles(new Set(files.map(f => f.id)));
                  } else {
                    setSelectedFiles(new Set());
                  }
                }}
                className="rounded border-gray-300"
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">大小</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">上传时间</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {folders.map((folder) => (
            <tr
              key={folder.id}
              className="hover:bg-gray-50 hover:shadow-sm transition-all duration-200 ease-out cursor-pointer group"
              onDoubleClick={() => navigateToFolder(folder.id)}
            >
              <td className="px-4 py-3">
                <input type="checkbox" className="rounded border-gray-300" disabled />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg group-hover:scale-110 transition-transform duration-200">
                    <Folder className="w-5 h-5 text-yellow-600" />
                  </div>
                  <span className="font-medium text-gray-900 group-hover:text-yellow-600 transition-colors duration-200">{folder.name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">-</td>
              <td className="px-4 py-3 text-sm text-gray-500">文件夹</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {format(new Date(folder.created_at), 'yyyy-MM-dd HH:mm')}
              </td>
              <td className="px-4 py-3 text-center">
                <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all duration-200">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
          {files.map((file) => (
            <tr
              key={file.id}
              className={`hover:bg-gray-50 hover:shadow-sm transition-all duration-200 ease-out ${selectedFiles.has(file.id) ? 'bg-blue-50' : ''}`}
              onContextMenu={(e) => handleContextMenu(e, file)}
            >
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => toggleFileSelection(file.id)}
                  className="rounded border-gray-300"
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${categoryColors[file.category]}`}>
                    {categoryIcons[file.category]}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{file.original_name}</span>
                    <p className="text-xs text-gray-500">{file.uploader_name}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{formatSize(file.size)}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{file.extension}</td>
              <td className="px-4 py-3 text-sm text-gray-500">
                {format(new Date(file.created_at), 'yyyy-MM-dd HH:mm')}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-105"
                    title="下载"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-105"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className="p-4 border border-gray-200 rounded-lg hover:shadow-lg hover:-translate-y-0.5 hover:border-yellow-300 transition-all duration-200 ease-out cursor-pointer group"
            onDoubleClick={() => navigateToFolder(folder.id)}
          >
            <div className="p-3 bg-yellow-100 rounded-lg w-fit mx-auto mb-2 group-hover:scale-110 group-hover:bg-yellow-200 transition-all duration-200">
              <Folder className="w-8 h-8 text-yellow-600" />
            </div>
            <p className="text-sm text-center font-medium text-gray-900 truncate group-hover:text-yellow-700 transition-colors duration-200">{folder.name}</p>
          </div>
        ))}
        {files.map((file) => (
          <div
            key={file.id}
            className={`p-4 border rounded-lg hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ease-out cursor-pointer group ${
              selectedFiles.has(file.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => toggleFileSelection(file.id)}
            onContextMenu={(e) => handleContextMenu(e, file)}
          >
            <div className={`p-3 rounded-lg w-fit mx-auto mb-2 group-hover:scale-110 transition-transform duration-200 ${categoryColors[file.category]}`}>
              {categoryIcons[file.category]}
            </div>
            <p className="text-sm text-center font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">{file.original_name}</p>
            <p className="text-xs text-center text-gray-500 mt-1">{formatSize(file.size)}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* 头部工具栏 */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">文件管理</h1>
          <div className="flex items-center gap-3">
            {/* 存储配额显示 */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
              <div className="w-32 h-2 bg-gray-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{ width: `${(quota.used / quota.total) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-600">
                {formatSize(quota.used)} / {formatSize(quota.total)}
              </span>
            </div>

            {/* 视图切换 */}
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-all duration-200 ease-out hover:bg-gray-100 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-all duration-200 ease-out hover:bg-gray-100 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

            {/* 上传按钮 */}
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 hover:shadow-md hover:-translate-y-px transition-all duration-200 ease-out cursor-pointer">
              上传文件
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        {/* 面包屑和搜索 */}
        <div className="flex items-center justify-between">
          {renderBreadcrumb()}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索文件..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 文件列表 */}
      <div className="flex-1 overflow-auto p-4">
        {renderFileList()}
      </div>

      {/* 上传进度弹窗 */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="上传进度"
        maxWidth="md"
      >
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {uploadProgress.map((progress, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 truncate">
                    {progress.fileName}
                  </span>
                  {progress.status === 'completed' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {progress.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      progress.status === 'error'
                        ? 'bg-red-500'
                        : progress.status === 'completed'
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                {progress.error && (
                  <p className="text-xs text-red-500 mt-1">{progress.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              handleDownload(contextMenu.file);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <Download className="w-4 h-4" />
            下载
          </button>
          <button
            onClick={() => {
              handleDelete(contextMenu.file.id);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            删除
          </button>
        </div>
      )}

      {/* 点击其他地方关闭右键菜单 */}
      {contextMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
