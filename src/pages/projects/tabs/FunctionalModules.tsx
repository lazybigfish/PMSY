
import React, { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { ProjectModule, Task, ProjectSupplier } from '../../../types';
import { Loader2, Download, Upload, FileSpreadsheet, ChevronRight, ChevronDown, CheckCircle, AlertTriangle, Plus, Trash2, ArrowUp, ArrowDown, Play, CheckSquare, Building2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface FunctionalModulesProps {
  projectId: string;
  canEdit?: boolean;
}

const FunctionalModules: React.FC<FunctionalModulesProps> = ({ projectId, canEdit = true }) => {
  const [modules, setModules] = useState<ProjectModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [suppliers, setSuppliers] = useState<ProjectSupplier[]>([]);

  useEffect(() => {
    fetchModules();
    fetchSuppliers();
    // fetchTasks(); // Removed initial full fetch
  }, [projectId]);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const { data, error } = await api.db
        .from('project_modules')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      const treeData = buildTree(data || []);
      setModules(treeData);
      
      // 默认展开所有模块
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
      // 1. 先获取项目供应商关联数据
      const { data: projectSuppliersData, error: psError } = await api.db
        .from('project_suppliers')
        .select('*')
        .eq('project_id', projectId);

      if (psError) throw psError;

      // 2. 获取供应商详情
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

  // 获取模块的供应商信息
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

    return roots;
  };

  // 统计各层级模块数据（使用加权平均计算完成度）
  const calculateLevelStats = (moduleList: ProjectModule[]) => {
    const stats: Record<number, { total: number; totalProgress: number }> = {};

    const traverse = (nodes: ProjectModule[]) => {
      nodes.forEach((node) => {
        const level = node.level || 1;
        if (!stats[level]) {
          stats[level] = { total: 0, totalProgress: 0 };
        }
        stats[level].total += 1;
        // 累加每个模块的进度值
        stats[level].totalProgress += (node.progress || 0);
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };

    traverse(moduleList);
    return stats;
  };

  // 获取层级名称
  const getLevelName = (level: number) => {
    const levelNames: Record<number, string> = {
      1: '一级',
      2: '二级',
      3: '三级',
      4: '四级',
      5: '五级',
      6: '六级',
      7: '七级',
      8: '八级',
      9: '九级',
      10: '十级',
    };
    return levelNames[level] || `${level}级`;
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  const selectModule = (id: string) => {
    setSelectedModuleId(id);
  };

  const fetchTasks = async (moduleId?: string) => {
    // If no specific module, fetch nothing initially (on demand load)
    // Or if we need to show all, optimize select.
    // For now, let's lazy load tasks when a module is selected.
    if (!moduleId) {
      // Clear tasks if deselecting? No, keep cache.
      return;
    }
    
    // Check if we already loaded tasks for this module (simple cache could be added later)
    // For now, just fetch for this module
    const { data } = await api.db
      .from('tasks')
      .select('id, title, status, module_id') // Select only needed fields
      .eq('project_id', projectId)
      .eq('module_id', moduleId);
      
    setTasks(prev => {
       // Merge new tasks, removing old ones for this module to avoid dupes
       const others = prev.filter(t => t.module_id !== moduleId);
       return [...others, ...(data as Task[] || [])];
    });
  };

  useEffect(() => {
    if (selectedModuleId) {
        fetchTasks(selectedModuleId);
    }
  }, [selectedModuleId]);

  const handleExport = () => {
    // Flatten tree for export
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

      console.log('Imported data:', data);
      await processImport(data);
    };
    reader.readAsBinaryString(file);
  };

  const processImport = async (data: any[]) => {
    if (!window.confirm('此操作将覆盖当前项目的所有功能模块。是否继续？')) return;

    setLoading(true);
    try {
        console.log('Raw imported data:', data); // Debug log

        // Normalize keys to handle potential whitespace or case issues
        const normalizedData = data.map(row => {
            const newRow: any = {};
            Object.keys(row).forEach(key => {
                newRow[key.trim()] = row[key];
            });
            return newRow;
        });

        // 1. Delete existing
        const { error: deleteError } = await api.db.from('project_modules').delete().eq('project_id', projectId);
        if (deleteError) throw deleteError;

        // 2. Insert new
        const parentStack: { id: string; level: number }[] = [];
        let insertedCount = 0;
        
        for (let i = 0; i < normalizedData.length; i++) {
            const row = normalizedData[i];
            // Try multiple variations of column names
            const levelStr = row['层级'] || row['Level'] || row['level'] || '1';
            const level = parseInt(String(levelStr), 10);
            
            const name = (row['模块名称'] || row['Module Name'] || row['name'] || row['Name'])?.trim();
            const desc = row['模块描述'] || row['Description'] || row['description'] || '';
            const statusStr = row['状态'] || row['Status'] || row['status'];

            if (!name) {
                console.warn(`Skipping row ${i}: Missing name`, row);
                continue; 
            }

            const status = reverseTranslateStatus(statusStr);
            
            // Adjust stack for hierarchy
            while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= level) {
                parentStack.pop();
            }
            
            const parentId = parentStack.length > 0 ? parentStack[parentStack.length - 1].id : null;

            const { data: inserted, error } = await api.db.from('project_modules').insert({
                project_id: projectId,
                name: name,
                description: desc,
                status: status,
                level: level,
                parent_id: parentId,
                sort_order: i
            });

            if (error) {
                console.error('Error inserting row:', row, error);
                throw error;
            }

            if (inserted && inserted[0]) {
                parentStack.push({ id: inserted[0].id, level: level });
                insertedCount++;
            }
        }
        
        console.log(`Successfully inserted ${insertedCount} modules`);
        
        await fetchModules();
        
        // Auto-expand all nodes after import
        const { data: allModules } = await api.db.from('project_modules').select('id').eq('project_id', projectId);
        if (allModules) {
            const newExpanded: Record<string, boolean> = {};
            allModules.forEach(m => newExpanded[m.id] = true);
            setExpanded(newExpanded);
        }

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
    
    // Find parent module to determine level
    let level = 1;
    if (parentId) {
        const findParent = (nodes: ProjectModule[]): ProjectModule | undefined => {
            for (const node of nodes) {
                if (node.id === parentId) return node;
                if (node.children) {
                    const found = findParent(node.children);
                    if (found) return found;
                }
            }
            return undefined;
        }
        const parent = findParent(modules);
        if (parent) {
            level = parent.level + 1;
        }
    }

    try {
        const { error } = await api.db.from('project_modules').insert({
            project_id: projectId,
            parent_id: parentId,
            name: name.trim(),
            level: level,
            status: 'not_started'
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
          const { error } = await api.db.from('project_modules').delete().eq('id', id);
          if (error) throw error;
          
          if (selectedModuleId === id) setSelectedModuleId(null);
          fetchModules();
      } catch (error) {
          console.error('Error deleting module:', error);
          alert('删除模块失败');
      }
  };

  const handleMoveModule = async (id: string, direction: 'up' | 'down') => {
    // This is a simplified sort implementation.
    // Ideally we need to swap sort_order with adjacent sibling.
    // For now, we will just alert that this requires backend support for reordering efficiently,
    // or we implement a basic swap if we have all siblings loaded.

    // Find the module and its siblings
    const findNodeAndSiblings = (nodes: ProjectModule[]): { node: ProjectModule, siblings: ProjectModule[], index: number } | null => {
        for (let i = 0; i < nodes.length; i++) {
            if (nodes[i].id === id) return { node: nodes[i], siblings: nodes, index: i };
            if (nodes[i].children) {
                const found = findNodeAndSiblings(nodes[i].children!);
                if (found) return found;
            }
        }
        return null;
    };

    const result = findNodeAndSiblings(modules);
    if (!result) return;

    const { node, siblings, index } = result;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= siblings.length) return;

    const targetNode = siblings[targetIndex];

    // Swap sort_order
    // Note: This assumes sort_order is populated. If not, we might need to initialize it.
    // Here we just swap their IDs in a temporary local state or update DB.
    // Since we don't have explicit sort_order management in frontend easily without re-fetching everything,
    // We will try to swap their 'sort_order' field in DB.

    try {
        const nodeOrder = node.sort_order || 0;
        const targetOrder = targetNode.sort_order || 0;

        // If orders are same or invalid, we might need a better strategy, but let's try simple swap
        await api.db.from('project_modules').update({ sort_order: targetOrder }).eq('id', node.id);
        await api.db.from('project_modules').update({ sort_order: nodeOrder }).eq('id', targetNode.id);

        fetchModules();
    } catch (error) {
        console.error('Error moving module:', error);
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

  const renderNode = (node: ProjectModule) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded[node.id];
    const supplier = getModuleSupplier(node.id);

    return (
      <div key={node.id} className="border-l border-gray-200 ml-4 pl-4">
        <div className={`flex items-center py-2 rounded px-2 group ${selectedModuleId === node.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
          <button
            onClick={() => toggleExpand(node.id)}
            className={`mr-2 p-1 rounded hover:bg-gray-200 ${hasChildren ? '' : 'invisible'}`}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <button onClick={() => selectModule(node.id)} className="font-medium text-gray-900 text-left flex-grow">
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
            {/* Quick Start Button */}
            {node.status !== 'in_progress' && node.status !== 'completed' && (
              <button
                onClick={(e) => handleQuickStart(e, node)}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="开始"
              >
                <Play className="h-4 w-4" />
              </button>
            )}
            {/* Quick Complete Button */}
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
                <button onClick={(e) => { e.stopPropagation(); handleMoveModule(node.id, 'up'); }} className="p-1 text-gray-400 hover:text-indigo-600" title="上移">
                    <ArrowUp className="h-4 w-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleMoveModule(node.id, 'down'); }} className="p-1 text-gray-400 hover:text-indigo-600" title="下移">
                    <ArrowDown className="h-4 w-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleAddModule(node.id); }} className="p-1 text-gray-400 hover:text-indigo-600" title="添加子模块">
                    <Plus className="h-4 w-4" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteModule(node.id); }} className="p-1 text-gray-400 hover:text-red-600" title="删除模块">
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {node.children?.map(renderNode)}
          </div>
        )}
      </div>
    );
  };

  const selectedModule = selectedModuleId
    ? modules.flatMap(function flatten(m: ProjectModule): ProjectModule[] {
        return [m, ...(m.children?.flatMap(flatten) || [])];
      }).find(m => m.id === selectedModuleId) || null
    : null;

  const associatedTasks = selectedModule
    ? tasks.filter(t => t.module_id === selectedModule.id)
    : [];

  const updateSelectedModule = async (patch: Partial<ProjectModule>) => {
    if (!selectedModule) return;
    // Optimistic UI update
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

    // Auto-update status based on progress
    if (newProgress === 100 && selectedModule.status !== 'completed') {
      updates.status = 'completed';
    } else if (newProgress > 0 && (selectedModule.status === 'not_started' || selectedModule.status === 'pending')) {
      updates.status = 'in_progress';
    }

    // Optimistic UI update
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
      // Revert optimistic update on error
      fetchModules();
    }
  };

  const handleStatusChange = async (newStatus: ProjectModule['status']) => {
    if (!selectedModule) return;

    const updates: Partial<ProjectModule> = { status: newStatus };

    // Auto-update progress when status is completed
    if (newStatus === 'completed') {
      updates.progress = 100;
    }

    // Optimistic UI update
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
      // Revert optimistic update on error
      fetchModules();
    }
  };

  const computeProgress = (node: ProjectModule): number => {
    const collect = (n: ProjectModule): ProjectModule[] => [n, ...(n.children?.flatMap(collect) || [])];
    const list = collect(node);
    const total = list.length;
    const done = list.filter(n => n.status === 'completed').length;
    return Math.round((done / Math.max(total, 1)) * 100);
  };

  if (loading) return <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">功能模块</h3>
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

      {/* 统计卡片 */}
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
                  // 加权平均完成度 = 总进度 / 模块数量
                  const percentage = total > 0 ? Math.round(totalProgress / total) : 0;
                  return (
                    <div
                      key={level}
                      className="relative h-24 bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group"
                    >
                      {/* 背景填充层 - 柔和的海洋蓝绿色系 */}
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-teal-400/30 via-cyan-400/20 to-blue-300/10 transition-all duration-500 ease-out group-hover:from-teal-400/40 group-hover:via-cyan-400/30 group-hover:to-blue-300/20"
                        style={{ height: `${percentage}%` }}
                      />
                      {/* 内容层 */}
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
            modules.map(renderNode)
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
                <h4 className="text-lg font-semibold text-gray-900">{selectedModule.name}</h4>
                <div className="flex items-center space-x-2">
                  {selectedModule.status === 'delayed' && <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1"/> 延期</span>}
                  {selectedModule.status === 'completed' && <span className="inline-flex items-center text-xs px-2 py-1 rounded-full bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1"/> 已完成</span>}
                </div>
              </div>

              {/* 供应商信息 */}
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
