
import React, { useEffect, useState } from 'react';
import { api, apiClient } from '../../../lib/api';
import { ProjectModule, Task, ProjectSupplier } from '../../../types';
import { Loader2, Download, Upload, FileSpreadsheet, ChevronRight, ChevronDown, CheckCircle, AlertTriangle, Plus, Trash2, Play, CheckSquare, Building2, Move, X, CornerDownRight, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface FunctionalModulesProps {
  projectId: string;
  canEdit?: boolean;
}

type MoveAction = 'before' | 'after' | 'child';

const FunctionalModules: React.FC<FunctionalModulesProps> = ({ projectId, canEdit = true }) => {
  const [modules, setModules] = useState<ProjectModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [suppliers, setSuppliers] = useState<ProjectSupplier[]>([]);
  
  // 移动模式状态
  const [moveMode, setMoveMode] = useState(false);
  const [movingModuleId, setMovingModuleId] = useState<string | null>(null);

  useEffect(() => {
    fetchModules();
    fetchSuppliers();
  }, [projectId]);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const { data, error } = await api.db
        .from('project_modules')
        .select('*')
        .eq('project_id', projectId)
        .order('path', { ascending: true });

      if (error) throw error;
      const treeData = buildTree(data || []);
      setModules(treeData);
      
      const allExpanded: Record<string, boolean> = {};
      const setAllExpanded = (nodes: ProjectModule[]) => {
        nodes.forEach((node) => {
          allExpanded[node.id] = true;
          if (node.children && node.children.length > 0) {
            setAllExpanded(node.children);
          }
        });
      };
      setAllExpanded(treeData);
      setExpanded(allExpanded);
    } catch (error) {
      console.error('Error fetching modules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const { data: projectSuppliersData, error: psError } = await api.db
        .from('project_suppliers')
        .select('*')
        .eq('project_id', projectId);

      if (psError) throw psError;

      const projectSuppliers = projectSuppliersData || [];
      if (projectSuppliers.length > 0) {
        const supplierIds = projectSuppliers.map(ps => ps.supplier_id).filter(Boolean);
        if (supplierIds.length > 0) {
          const { data: suppliersData } = await api.db
            .from('suppliers')
            .select('id, name, contact_person, phone')
            .in('id', supplierIds);
          
          const suppliersMap = new Map(suppliersData?.map(s => [s.id, s]) || []);
          const mappedData = projectSuppliers.map(ps => ({
            ...ps,
            supplier: suppliersMap.get(ps.supplier_id)
          }));
          setSuppliers(mappedData);
        } else {
          setSuppliers(projectSuppliers);
        }
      } else {
        setSuppliers([]);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const getModuleSupplier = (moduleId: string) => {
    return suppliers.find(s => s.module_ids?.includes(moduleId));
  };

  const buildTree = (items: ProjectModule[]) => {
    const map: Record<string, ProjectModule> = {};
    const roots: ProjectModule[] = [];

    items.forEach((item) => {
      map[item.id] = { ...item, children: [] };
    });

    items.forEach((item) => {
      if (item.parent_id && map[item.parent_id]) {
        map[item.parent_id].children?.push(map[item.id]);
      } else {
        roots.push(map[item.id]);
      }
    });

    const sortByPath = (nodes: ProjectModule[]) => {
      nodes.sort((a, b) => (a.path || '').localeCompare(b.path || ''));
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortByPath(node.children);
        }
      });
    };

    sortByPath(roots);
    return roots;
  };

  const flattenTree = (nodes: ProjectModule[], parentId: string | null = null, result: ProjectModule[] = []): ProjectModule[] => {
    nodes.forEach((node) => {
      result.push({ ...node, parent_id: parentId });
      if (node.children && node.children.length > 0 && expanded[node.id]) {
        flattenTree(node.children, node.id, result);
      }
    });
    return result;
  };

  // 完整的扁平化，不考虑展开状态，用于移动计算
  const flattenTreeAll = (nodes: ProjectModule[], parentId: string | null = null, result: ProjectModule[] = []): ProjectModule[] => {
    nodes.forEach((node) => {
      result.push({ ...node, parent_id: parentId });
      if (node.children && node.children.length > 0) {
        flattenTreeAll(node.children, node.id, result);
      }
    });
    return result;
  };

  const flattenedModules = flattenTree(modules);
  const allModules = flattenTreeAll(modules);

  const calculateLevelStats = (moduleList: ProjectModule[]) => {
    const stats: Record<number, { total: number; totalProgress: number }> = {};

    const traverse = (nodes: ProjectModule[]) => {
      nodes.forEach((node) => {
        const level = node.level || 1;
        if (!stats[level]) {
          stats[level] = { total: 0, totalProgress: 0 };
        }
        stats[level].total += 1;
        stats[level].totalProgress += (node.progress || 0);
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };

    traverse(moduleList);
    return stats;
  };

  const getLevelName = (level: number) => {
    const levelNames: Record<number, string> = {
      1: '一级', 2: '二级', 3: '三级', 4: '四级', 5: '五级',
      6: '六级', 7: '七级', 8: '八级', 9: '九级', 10: '十级',
    };
    return levelNames[level] || `${level}级`;
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectModule = (id: string) => {
    if (moveMode) return;
    setSelectedModuleId(id);
  };

  const findModule = (nodes: ProjectModule[], id: string): ProjectModule | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findModule(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const getModuleById = (id: string): ProjectModule | undefined => {
    return flattenedModules.find(m => m.id === id);
  };

  // 开始移动模式
  const startMoveMode = (moduleId: string) => {
    setMovingModuleId(moduleId);
    setMoveMode(true);
    // 展开所有模块以便选择目标
    const allExpanded: Record<string, boolean> = {};
    const expandAll = (nodes: ProjectModule[]) => {
      nodes.forEach((node) => {
        allExpanded[node.id] = true;
        if (node.children && node.children.length > 0) {
          expandAll(node.children);
        }
      });
    };
    expandAll(modules);
    setExpanded(allExpanded);
  };

  // 取消移动
  const cancelMoveMode = () => {
    setMoveMode(false);
    setMovingModuleId(null);
  };

  // 生成 path 的辅助函数
  const generatePath = (parentPath: string | null | undefined, siblingIndex: number): string => {
    if (!parentPath) {
      return String(siblingIndex + 1);
    }
    return `${parentPath}.${siblingIndex + 1}`;
  };

  // 递归更新节点及其子节点的 path
  const updatePathRecursive = (node: ProjectModule, parentPath: string): ProjectModule => {
    const siblings = node.parent_id 
      ? allModules.filter(m => m.parent_id === node.parent_id && m.id !== node.id)
      : allModules.filter(m => !m.parent_id && m.id !== node.id);
    const siblingIndex = siblings.findIndex(s => s.id === node.id);
    const actualIndex = siblingIndex === -1 ? siblings.length : siblingIndex;
    const newPath = generatePath(parentPath, actualIndex);
    
    const updatedNode = { ...node, path: newPath };
    if (updatedNode.children && updatedNode.children.length > 0) {
      updatedNode.children = updatedNode.children.map(child =>
        updatePathRecursive(child, newPath)
      );
    }
    return updatedNode;
  };

  // 执行移动
  const executeMove = async (targetId: string, action: MoveAction) => {
    if (!movingModuleId || movingModuleId === targetId) return;

    const movingModule = getModuleById(movingModuleId);
    const targetModule = getModuleById(targetId);

    if (!movingModule || !targetModule) return;

    // 检查是否是将父模块移动到子模块下（循环引用）
    const isTargetDescendant = (nodeId: string, ancestorId: string): boolean => {
      const node = findModule(modules, nodeId);
      if (!node || !node.children) return false;
      for (const child of node.children) {
        if (child.id === ancestorId) return true;
        if (isTargetDescendant(child.id, ancestorId)) return true;
      }
      return false;
    };

    if (isTargetDescendant(movingModuleId, targetId)) {
      alert('不能将父模块移动到其子模块下');
      return;
    }

    try {
      let newParentId: string | null = null;
      let newLevel: number;
      let newSortOrder: number;
      let newPath: string;

      // 使用 allModules（包含所有模块，不考虑展开状态）来计算
      const targetSiblings = allModules.filter(m => m.parent_id === targetModule.parent_id);
      const targetIndex = targetSiblings.findIndex(s => s.id === targetId);

      switch (action) {
        case 'before':
          newParentId = targetModule.parent_id;
          newLevel = targetModule.level || 1;
          newSortOrder = targetIndex;
          newPath = generatePath(targetModule.path?.split('.').slice(0, -1).join('.') || null, targetIndex);
          break;
        case 'after':
          newParentId = targetModule.parent_id;
          newLevel = targetModule.level || 1;
          newSortOrder = targetIndex + 1;
          newPath = generatePath(targetModule.path?.split('.').slice(0, -1).join('.') || null, targetIndex + 1);
          break;
        case 'child':
          newParentId = targetId;
          newLevel = (targetModule.level || 1) + 1;
          const targetChildren = allModules.filter(m => m.parent_id === targetId);
          newSortOrder = targetChildren.length;
          newPath = generatePath(targetModule.path, targetChildren.length);
          break;
      }

      // 乐观更新
      setModules(prev => moveModuleInTree(prev, movingModuleId, newParentId, newLevel, newSortOrder, newPath));
      setMoveMode(false);
      setMovingModuleId(null);

      // 更新数据库 - 同时更新 path
      const { error } = await api.db.from('project_modules').update({
        parent_id: newParentId,
        level: newLevel,
        sort_order: newSortOrder,
        path: newPath
      }).eq('id', movingModuleId);

      if (error) throw error;

      // 重新获取数据以确保子模块的 path 也被更新
      fetchModules();
    } catch (err) {
      console.error('Error moving module:', err);
      alert('移动模块失败，正在恢复...');
      // 失败时重新获取数据恢复状态
      fetchModules();
    }
  };

  const moveModuleInTree = (
    nodes: ProjectModule[],
    movedId: string,
    newParentId: string | null,
    newLevel: number,
    newSortOrder: number,
    newPath: string
  ): ProjectModule[] => {
    const deepClone = (items: ProjectModule[]): ProjectModule[] => {
      return items.map(node => ({
        ...node,
        children: node.children ? deepClone(node.children) : []
      }));
    };

    // 递归更新节点及其子节点的层级和 path
    const updateLevelAndPathRecursive = (node: ProjectModule, parentLevel: number, parentPath: string): ProjectModule => {
      const updatedNode = { 
        ...node, 
        level: parentLevel + 1,
        path: parentPath ? `${parentPath}.${node.path?.split('.').pop() || '1'}` : (node.path || '1')
      };
      if (updatedNode.children && updatedNode.children.length > 0) {
        updatedNode.children = updatedNode.children.map(child =>
          updateLevelAndPathRecursive(child, updatedNode.level, updatedNode.path || '')
        );
      }
      return updatedNode;
    };

    let movedNode: ProjectModule | null = null;

    const removeFromTree = (items: ProjectModule[]): ProjectModule[] => {
      const result: ProjectModule[] = [];
      for (const node of items) {
        if (node.id === movedId) {
          movedNode = { ...node, children: node.children ? deepClone(node.children) : [] };
          continue;
        }
        if (node.children && node.children.length > 0) {
          node.children = removeFromTree(node.children);
        }
        result.push(node);
      }
      return result;
    };

    const addToTree = (items: ProjectModule[]): ProjectModule[] => {
      if (!movedNode) return items;

      // 更新被移动节点及其所有子节点的层级和 path
      const updatedNode = updateLevelAndPathRecursive(
        { ...movedNode, parent_id: newParentId, sort_order: newSortOrder, path: newPath },
        newLevel - 1,
        newPath.split('.').slice(0, -1).join('.')
      );

      if (newParentId === null) {
        return [...items, updatedNode];
      }

      return items.map(node => {
        if (node.id === newParentId) {
          return {
            ...node,
            children: [...(node.children || []), updatedNode]
          };
        }
        if (node.children && node.children.length > 0) {
          return {
            ...node,
            children: addToTree(node.children)
          };
        }
        return node;
      });
    };

    let result = removeFromTree(nodes);
    result = addToTree(result);

    // 按 path 排序
    const resortByPath = (items: ProjectModule[]): ProjectModule[] => {
      items.sort((a, b) => (a.path || '').localeCompare(b.path || ''));
      items.forEach(node => {
        if (node.children && node.children.length > 0) {
          resortByPath(node.children);
        }
      });
      return items;
    };

    return resortByPath(result);
  };

  const handleExport = () => {
    const rows: any[] = [];
    const traverse = (nodes: ProjectModule[], depth: number) => {
      nodes.forEach((node) => {
        rows.push({
          '模块名称': '  '.repeat(depth) + node.name,
          '模块描述': node.description,
          '状态': translateStatus(node.status),
          '层级': depth + 1,
          'ID': node.id,
          'Parent ID': node.parent_id
        });
        if (node.children) {
          traverse(node.children, depth + 1);
        }
      });
    };
    traverse(modules, 0);

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '功能模块');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, `项目功能模块_${projectId}.xlsx`);
  };

  const handleTemplateDownload = () => {
    const rows = [
      { '模块名称': '系统管理', '模块描述': '管理用户和设置', '状态': '未开始', '层级': 1 },
      { '模块名称': '  用户管理', '模块描述': '用户增删改查', '状态': '未开始', '层级': 2 },
      { '模块名称': '  角色管理', '模块描述': '角色权限管理', '状态': '未开始', '层级': 2 },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '模板');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(data, '功能模块导入模板.xlsx');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      await processImport(data);
    };
    reader.readAsBinaryString(file);
  };

  const processImport = async (data: any[]) => {
    if (!window.confirm('此操作将覆盖当前项目的所有功能模块。是否继续？')) return;

    setLoading(true);
    try {
      const normalizedData = data.map(row => {
        const newRow: any = {};
        Object.keys(row).forEach(key => {
          newRow[key.trim()] = row[key];
        });
        return newRow;
      });

      await apiClient.post('/rest/v1/delete', {
        table: 'project_modules',
        conditions: { project_id: projectId }
      });

      const parentStack: { id: string; level: number; path: string }[] = [];
      // 按层级统计兄弟节点数量，用于生成正确的 path
      const levelSiblingCount: Record<number, number> = {};
      let insertedCount = 0;
      
      for (let i = 0; i < normalizedData.length; i++) {
        const row = normalizedData[i];
        const levelStr = row['层级'] || row['Level'] || row['level'] || '1';
        const level = parseInt(String(levelStr), 10);
        
        const name = (row['模块名称'] || row['Module Name'] || row['name'] || row['Name'])?.trim();
        const desc = row['模块描述'] || row['Description'] || row['description'] || '';
        const statusStr = row['状态'] || row['Status'] || row['status'];

        if (!name) continue;

        const status = reverseTranslateStatus(statusStr);
        
        // 维护 parentStack，保持正确的父子关系
        while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= level) {
          parentStack.pop();
        }
        
        const parentId = parentStack.length > 0 ? parentStack[parentStack.length - 1].id : null;
        const parentPath = parentStack.length > 0 ? parentStack[parentStack.length - 1].path : null;
        
        // 初始化当前层级的兄弟计数
        if (levelSiblingCount[level] === undefined) {
          levelSiblingCount[level] = 0;
        }
        // 当前层级的兄弟索引
        const siblingIndex = levelSiblingCount[level];
        // 递增当前层级的兄弟计数
        levelSiblingCount[level]++;
        
        const path = parentPath 
          ? `${parentPath}.${siblingIndex + 1}`
          : String(siblingIndex + 1);

        const { data: inserted, error } = await api.db.from('project_modules').insert({
          project_id: projectId,
          name: name,
          description: desc,
          status: status,
          level: level,
          parent_id: parentId,
          sort_order: i,
          path: path
        });

        if (error) throw error;

        if (inserted && inserted[0]) {
          parentStack.push({ id: inserted[0].id, level: level, path: path });
          insertedCount++;
        }
      }
      
      await fetchModules();
      
      alert(`导入成功，共导入 ${insertedCount} 个模块`);
    } catch (error) {
      console.error('Import error:', error);
      alert('导入失败，请检查控制台日志');
    } finally {
      setLoading(false);
    }
  };

  const handleAddModule = async (parentId: string | null) => {
    const name = prompt('请输入新模块名称:');
    if (!name || !name.trim()) return;
    
    let level = 1;
    let parentPath: string | null = null;
    if (parentId) {
      const parent = findModule(modules, parentId);
      if (parent) {
        level = (parent.level || 1) + 1;
        parentPath = parent.path || null;
      }
    }

    try {
      // 获取同级模块数量以计算 path
      const siblings = allModules.filter(m => m.parent_id === parentId);
      const siblingCount = siblings.length;
      const path = parentPath 
        ? `${parentPath}.${siblingCount + 1}`
        : String(siblingCount + 1);

      const { error } = await api.db.from('project_modules').insert({
        project_id: projectId,
        parent_id: parentId,
        name: name.trim(),
        level: level,
        status: 'not_started',
        path: path,
        sort_order: siblingCount
      });
      
      if (error) throw error;
      fetchModules();
    } catch (error) {
      console.error('Error adding module:', error);
      alert('添加模块失败');
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!window.confirm('确定要删除该模块及其所有子模块吗？此操作不可撤销。')) return;

    try {
      await apiClient.post('/rest/v1/delete', {
        table: 'project_modules',
        conditions: { id: id }
      });
      
      if (selectedModuleId === id) setSelectedModuleId(null);
      fetchModules();
    } catch (error) {
      console.error('Error deleting module:', error);
      alert('删除模块失败');
    }
  };

  const handleQuickStart = async (e: React.MouseEvent, node: ProjectModule) => {
    e.stopPropagation();
    if (node.status === 'in_progress') return;

    try {
      const { error } = await api.db
        .from('project_modules')
        .update({ status: 'in_progress' })
        .eq('id', node.id);

      if (error) throw error;
      fetchModules();
    } catch (error) {
      console.error('Error starting module:', error);
      alert('开始模块失败');
    }
  };

  const handleQuickComplete = async (e: React.MouseEvent, node: ProjectModule) => {
    e.stopPropagation();
    if (node.status === 'completed') return;

    try {
      const { error } = await api.db
        .from('project_modules')
        .update({ status: 'completed', progress: 100 })
        .eq('id', node.id);

      if (error) throw error;
      fetchModules();
    } catch (error) {
      console.error('Error completing module:', error);
      alert('完成模块失败');
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'in_progress': return '进行中';
      case 'paused': return '已暂停';
      case 'delayed': return '延期';
      default: return '未开始';
    }
  };

  const reverseTranslateStatus = (status: string) => {
    switch (status) {
      case '已完成': return 'completed';
      case '进行中': return 'in_progress';
      case '已暂停': return 'paused';
      case '未开始': return 'not_started';
      case '延期': return 'delayed';
      default: return 'not_started';
    }
  };

  // 渲染模块节点
  const renderNode = (node: ProjectModule) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded[node.id];
    const supplier = getModuleSupplier(node.id);
    const isSelected = selectedModuleId === node.id;
    const isMoving = movingModuleId === node.id;
    const level = node.level || 1;
    
    // 使用 path 字段显示层级标识，如 1, 1.1, 1.1.1
    const displayIndex = node.path || '';

    return (
      <div key={node.id} className="border-l border-gray-200 ml-4 pl-4">
        <div 
          className={`flex items-center py-2 rounded px-2 group transition-all ${
            isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'
          } ${
            isMoving ? 'bg-yellow-100 ring-2 ring-yellow-400' : ''
          }`}
        >
          <button
            onClick={() => toggleExpand(node.id)}
            className={`mr-2 p-1 rounded hover:bg-gray-200 ${hasChildren ? '' : 'invisible'}`}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          
          {/* 序号显示 - 使用 path 字段 */}
          {displayIndex && (
            <span className="text-xs text-gray-400 mr-2 font-mono min-w-[2rem]">
              {displayIndex}
            </span>
          )}
          
          <button 
            onClick={() => selectModule(node.id)} 
            className="font-medium text-gray-900 text-left flex-grow"
            disabled={moveMode}
          >
            {node.name}
            {supplier && (
              <span className="ml-2 inline-flex items-center text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700" title={`供应商: ${supplier.supplier?.name}`}>
                <Building2 className="h-3 w-3 mr-1" />
                {supplier.supplier?.name}
              </span>
            )}
          </button>

          {/* 进度显示 */}
          <div className="flex items-center mr-3 w-24">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden mr-2">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  node.status === 'completed' ? 'bg-green-500' :
                  node.status === 'in_progress' ? 'bg-blue-500' :
                  node.status === 'delayed' ? 'bg-red-400' :
                  'bg-gray-400'
                }`}
                style={{ width: `${node.progress || 0}%` }}
              />
            </div>
            <span className={`text-xs font-medium w-8 text-right ${
              node.status === 'completed' ? 'text-green-600' :
              node.status === 'in_progress' ? 'text-blue-600' :
              node.status === 'delayed' ? 'text-red-500' :
              'text-gray-500'
            }`}>
              {node.progress || 0}%
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {node.status !== 'in_progress' && node.status !== 'completed' && (
              <button
                onClick={(e) => handleQuickStart(e, node)}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="开始"
              >
                <Play className="h-4 w-4" />
              </button>
            )}
            {node.status !== 'completed' && (
              <button
                onClick={(e) => handleQuickComplete(e, node)}
                className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                title="完成"
              >
                <CheckSquare className="h-4 w-4" />
              </button>
            )}
            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                node.status === 'completed' ? 'bg-green-100 text-green-800' :
                node.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                node.status === 'delayed' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
            }`}>
                {translateStatus(node.status)}
            </span>

            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!moveMode && (
                <button 
                  onClick={(e) => { e.stopPropagation(); startMoveMode(node.id); }} 
                  className="p-1 text-gray-400 hover:text-indigo-600" 
                  title="移动模块"
                >
                  <Move className="h-4 w-4" />
                </button>
              )}
              <button 
                onClick={(e) => { e.stopPropagation(); handleAddModule(node.id); }} 
                className="p-1 text-gray-400 hover:text-indigo-600" 
                title="添加子模块"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteModule(node.id); }} 
                className="p-1 text-gray-400 hover:text-red-600" 
                title="删除模块"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 移动模式下的操作按钮 */}
        {moveMode && movingModuleId !== node.id && (
          <div className="flex items-center gap-2 ml-8 mt-1 mb-2">
            <button
              onClick={() => executeMove(node.id, 'before')}
              className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 flex items-center gap-1"
              title="移动到该模块之前（同级）"
            >
              <ArrowRight className="h-3 w-3 rotate-180" />
              移到前面
            </button>
            <button
              onClick={() => executeMove(node.id, 'after')}
              className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 flex items-center gap-1"
              title="移动到该模块之后（同级）"
            >
              <ArrowRight className="h-3 w-3" />
              移到后面
            </button>
            <button
              onClick={() => executeMove(node.id, 'child')}
              className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 flex items-center gap-1"
              title="移动为该模块的子级"
            >
              <CornerDownRight className="h-3 w-3" />
              设为子级
            </button>
          </div>
        )}

        {hasChildren && isExpanded && (
          <div className="ml-4">
            {node.children?.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  const selectedModule = selectedModuleId
    ? findModule(modules, selectedModuleId)
    : null;

  const associatedTasks = selectedModuleId
    ? tasks.filter(t => t.module_id === selectedModuleId)
    : [];

  const updateSelectedModule = async (patch: Partial<ProjectModule>) => {
    if (!selectedModule) return;
    
    setModules(prev => {
      const updateTree = (nodes: ProjectModule[]): ProjectModule[] =>
        nodes.map(n => n.id === selectedModule.id
          ? { ...n, ...patch }
          : { ...n, children: n.children ? updateTree(n.children) : [] });
      return updateTree(prev);
    });
    
    await api.db
      .from('project_modules')
      .update(patch as any)
      .eq('id', selectedModule.id);
  };

  const handleProgressChange = async (newProgress: number) => {
    if (!selectedModule) return;

    const updates: Partial<ProjectModule> = { progress: newProgress };

    if (newProgress === 100 && selectedModule.status !== 'completed') {
      updates.status = 'completed';
    } else if (newProgress > 0 && (selectedModule.status === 'not_started' || selectedModule.status === 'pending')) {
      updates.status = 'in_progress';
    }

    setModules(prev => {
      const updateTree = (nodes: ProjectModule[]): ProjectModule[] =>
        nodes.map(n => n.id === selectedModule.id
          ? { ...n, ...updates }
          : { ...n, children: n.children ? updateTree(n.children) : [] });
      return updateTree(prev);
    });

    const { error } = await api.db
      .from('project_modules')
      .update(updates as any)
      .eq('id', selectedModule.id);

    if (error) {
      console.error('Error updating progress:', error);
      alert('更新进度失败: ' + error.message);
      fetchModules();
    }
  };

  const handleStatusChange = async (newStatus: ProjectModule['status']) => {
    if (!selectedModule) return;

    const updates: Partial<ProjectModule> = { status: newStatus };

    if (newStatus === 'completed') {
      updates.progress = 100;
    }

    setModules(prev => {
      const updateTree = (nodes: ProjectModule[]): ProjectModule[] =>
        nodes.map(n => n.id === selectedModule.id
          ? { ...n, ...updates }
          : { ...n, children: n.children ? updateTree(n.children) : [] });
      return updateTree(prev);
    });

    const { error } = await api.db
      .from('project_modules')
      .update(updates as any)
      .eq('id', selectedModule.id);

    if (error) {
      console.error('Error updating status:', error);
      alert('更新状态失败: ' + error.message);
      fetchModules();
    }
  };

  if (loading) return <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />;

  return (
    <div className="space-y-4">
      {/* 移动模式提示栏 */}
      {moveMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Move className="h-5 w-5 text-yellow-600" />
            <span className="text-yellow-800">
              正在移动模块：<strong>{getModuleById(movingModuleId || '')?.name}</strong>
            </span>
            <span className="text-yellow-600 text-sm ml-2">
              点击目标模块下方的按钮选择移动位置
            </span>
          </div>
          <button
            onClick={cancelMoveMode}
            className="px-3 py-1 bg-white border border-yellow-300 text-yellow-700 rounded hover:bg-yellow-100 flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            取消
          </button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          功能模块 
          {!moveMode && <span className="text-xs text-gray-500 ml-2">（点击移动按钮调整位置）</span>}
        </h3>
        <div className="flex space-x-2">
          <button onClick={() => handleAddModule(null)} className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded shadow-sm text-sm hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" /> 新增模块
          </button>
          <button onClick={handleExport} className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded shadow-sm text-sm hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" /> 导出
          </button>
          <button onClick={handleTemplateDownload} className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded shadow-sm text-sm hover:bg-gray-50">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> 模板
          </button>
          <label className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded shadow-sm text-sm hover:bg-gray-50 cursor-pointer">
            <Upload className="h-4 w-4 mr-2" /> 导入
            <input type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </div>

      {modules.length > 0 && (
        <div className="w-full">
          {(() => {
            const stats = calculateLevelStats(modules);
            const levels = Object.keys(stats).map(Number).sort((a, b) => a - b);
            const cardCount = levels.length;
            return (
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cardCount}, minmax(0, 1fr))` }}>
                {levels.map((level) => {
                  const { total, totalProgress } = stats[level];
                  const percentage = total > 0 ? Math.round(totalProgress / total) : 0;
                  return (
                    <div
                      key={level}
                      className="relative h-24 bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-teal-400/30 via-cyan-400/20 to-blue-300/10 transition-all duration-500 ease-out group-hover:from-teal-400/40 group-hover:via-cyan-400/30 group-hover:to-blue-300/20"
                        style={{ height: `${percentage}%` }}
                      />
                      <div className="relative z-10 flex flex-col items-center justify-center h-full p-3">
                        <span className="text-sm font-medium text-gray-500 mb-1">{getLevelName(level)}模块</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-bold text-gray-900">{total}</span>
                          <span className="text-xs text-gray-400">个</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-teal-600">{percentage}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4">
          {modules.length === 0 ? (
            <div className="text-center text-gray-500 py-8">暂无功能模块。请从Excel导入开始。</div>
          ) : (
            modules.map((module) => renderNode(module))
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          {!selectedModule ? (
            <div className="text-center text-gray-500 py-20">
              请选择左侧模块以编辑详情
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <input
                    type="text"
                    className="text-lg font-semibold text-gray-900 border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none bg-transparent w-full px-1 -mx-1 py-0.5 transition-colors"
                    value={selectedModule.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setModules(prev => {
                        const updateTree = (nodes: ProjectModule[]): ProjectModule[] =>
                          nodes.map(n => n.id === selectedModule.id
                            ? { ...n, name: newName }
                            : { ...n, children: n.children ? updateTree(n.children) : [] });
                        return updateTree(prev);
                      });
                    }}
                    onBlur={async (e) => {
                      const newName = e.target.value.trim();
                      if (!newName) {
                        fetchModules();
                        alert('模块名称不能为空');
                        return;
                      }
                      if (newName !== selectedModule.name) {
                        const { error } = await api.db
                          .from('project_modules')
                          .update({ name: newName })
                          .eq('id', selectedModule.id);
                        if (error) {
                          console.error('Error updating module name:', error);
                          alert('更新模块名称失败: ' + error.message);
                          fetchModules();
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      }
                    }}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  {selectedModule.status === 'delayed' && <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1"/> 延期</span>}
                  {selectedModule.status === 'completed' && <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1"/> 已完成</span>}
                </div>
              </div>

              {(() => {
                const supplier = getModuleSupplier(selectedModule.id);
                if (!supplier) return null;
                return (
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="flex items-center mb-2">
                      <Building2 className="h-4 w-4 text-orange-600 mr-2" />
                      <h5 className="text-sm font-medium text-orange-800">供应商信息</h5>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">名称:</span>
                        <span className="ml-1 text-gray-900">{supplier.supplier?.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">联系人:</span>
                        <span className="ml-1 text-gray-900">{supplier.supplier?.contact_person || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">电话:</span>
                        <span className="ml-1 text-gray-900">{supplier.supplier?.phone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">合同金额:</span>
                        <span className="ml-1 text-gray-900 font-medium">¥{(Number(supplier.contract_amount) || 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <label className="text-sm text-gray-700">模块介绍</label>
                <textarea
                  className="w-full border rounded p-2 h-28 focus:ring-2 focus:ring-indigo-500"
                  value={selectedModule.description || ''}
                  onChange={(e) => updateSelectedModule({ description: e.target.value })}
                  placeholder="请输入模块介绍..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">模块层级</label>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded font-medium">
                    {getLevelName(selectedModule.level || 1)}
                  </span>
                  <span className="text-xs text-gray-500">（点击移动按钮调整层级）</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">完成情况</label>
                <select
                  className="border rounded p-2 w-48"
                  value={selectedModule.status}
                  onChange={(e) => handleStatusChange(e.target.value as ProjectModule['status'])}
                >
                  <option value="not_started">未开始</option>
                  <option value="in_progress">进行中</option>
                  <option value="paused">已暂停</option>
                  <option value="delayed">延期</option>
                  <option value="completed">已完成</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">关联功能点（任务）</label>
                {associatedTasks.length === 0 ? (
                  <div className="text-sm text-gray-500">暂无关联任务</div>
                ) : (
                  <ul className="divide-y divide-gray-200 border rounded">
                    {associatedTasks.map(t => (
                      <li key={t.id} className="px-3 py-2 text-sm">
                        <span className="font-medium text-gray-900">{t.title}</span>
                        <span className="ml-2 text-gray-500">{t.status === 'done' ? '已完成' : t.status === 'in_progress' ? '进行中' : '未开始'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-700">完成度</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedModule.progress || 0}
                    onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <span className="text-sm font-medium text-gray-700 w-12 text-right">{selectedModule.progress || 0}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded ${selectedModule.status === 'completed' ? 'bg-green-500' : selectedModule.status === 'in_progress' ? 'bg-blue-500' : selectedModule.status === 'delayed' ? 'bg-red-500' : 'bg-gray-400'}`}
                    style={{ width: `${selectedModule.progress || 0}%`, transition: 'width 300ms ease' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FunctionalModules;
