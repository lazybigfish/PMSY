import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, RotateCcw, History } from 'lucide-react';
import { Project, Profile } from '../../../types';
import { DatePicker } from '../../../components/DatePicker';

export type SearchOperator = 'contains' | 'not_contains' | 'eq' | 'neq' | 'gt' | 'lt' | 'empty' | 'not_empty';

export interface SearchCondition {
  id: string;
  field: string;
  operator: SearchOperator;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any;
  logic: 'AND' | 'OR';
}

interface AdvancedSearchProps {
  onSearch: (conditions: SearchCondition[]) => void;
  projects: Project[];
  users: Profile[];
  isOpen: boolean;
  onClose: () => void;
}

const FIELD_OPTIONS = [
  { value: 'title', label: '任务标题', type: 'text' },
  { value: 'description', label: '任务描述', type: 'text' },
  { value: 'project_id', label: '所属项目', type: 'select' },
  { value: 'priority', label: '优先级', type: 'select' },
  { value: 'status', label: '状态', type: 'select' },
  { value: 'assignee', label: '处理人', type: 'select' }, // Special handling for array
  { value: 'created_by', label: '创建人', type: 'select' },
  { value: 'due_date', label: '截止日期', type: 'date' },
  { value: 'created_at', label: '创建时间', type: 'date' },
  { value: 'completed_at', label: '完成时间', type: 'date' },
  { value: 'is_public', label: '是否公开', type: 'boolean' },
];

const OPERATOR_OPTIONS: Record<string, { value: SearchOperator; label: string }[]> = {
  text: [
    { value: 'contains', label: '包含' },
    { value: 'not_contains', label: '不包含' },
    { value: 'eq', label: '等于' },
    { value: 'neq', label: '不等于' },
    { value: 'empty', label: '为空' },
    { value: 'not_empty', label: '不为空' },
  ],
  select: [
    { value: 'eq', label: '等于' },
    { value: 'neq', label: '不等于' },
    { value: 'empty', label: '为空' },
    { value: 'not_empty', label: '不为空' },
  ],
  date: [
    { value: 'eq', label: '等于' },
    { value: 'neq', label: '不等于' },
    { value: 'gt', label: '晚于' },
    { value: 'lt', label: '早于' },
    { value: 'empty', label: '为空' },
    { value: 'not_empty', label: '不为空' },
  ],
  boolean: [
    { value: 'eq', label: '等于' },
  ],
};

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSearch,
  projects,
  users,
  isOpen,
  onClose,
}) => {
  const [conditions, setConditions] = useState<SearchCondition[]>([
    { id: '1', field: 'title', operator: 'contains', value: '', logic: 'AND' },
  ]);
  const [history, setHistory] = useState<SearchCondition[][]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('task_search_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  if (!isOpen) return null;

  const addCondition = () => {
    if (conditions.length >= 5) return;
    setConditions([
      ...conditions,
      {
        id: Math.random().toString(36).substr(2, 9),
        field: 'title',
        operator: 'contains',
        value: '',
        logic: 'AND',
      },
    ]);
  };

  const removeCondition = (id: string) => {
    if (conditions.length === 1) return;
    setConditions(conditions.filter((c) => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<SearchCondition>) => {
    setConditions(
      conditions.map((c) => {
        if (c.id === id) {
          const newCondition = { ...c, ...updates };
          // Reset value if field changes
          if (updates.field && updates.field !== c.field) {
            const fieldType = FIELD_OPTIONS.find((f) => f.value === updates.field)?.type || 'text';
            newCondition.operator = OPERATOR_OPTIONS[fieldType][0].value;
            newCondition.value = '';
          }
          return newCondition;
        }
        return c;
      })
    );
  };

  const handleSearch = () => {
    onSearch(conditions);
    // Save to history
    const newHistory = [conditions, ...history.slice(0, 4)];
    setHistory(newHistory);
    localStorage.setItem('task_search_history', JSON.stringify(newHistory));
  };

  const handleReset = () => {
    setConditions([{ id: '1', field: 'title', operator: 'contains', value: '', logic: 'AND' }]);
    onSearch([]);
  };

  const renderValueInput = (condition: SearchCondition) => {
    const fieldType = FIELD_OPTIONS.find((f) => f.value === condition.field)?.type || 'text';

    if (condition.operator === 'empty' || condition.operator === 'not_empty') {
      return null;
    }

    switch (fieldType) {
      case 'select':
        if (condition.field === 'project_id') {
          return (
            <select
              className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
              value={condition.value}
              onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            >
              <option value="">选择项目</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          );
        }
        if (condition.field === 'priority') {
          return (
            <select
              className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
              value={condition.value}
              onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            >
              <option value="">选择优先级</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          );
        }
        if (condition.field === 'status') {
          return (
            <select
              className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
              value={condition.value}
              onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            >
              <option value="">选择状态</option>
              <option value="todo">未开始</option>
              <option value="in_progress">进行中</option>
              <option value="paused">已暂停</option>
              <option value="canceled">已取消</option>
              <option value="done">已完成</option>
            </select>
          );
        }
        if (condition.field === 'assignee' || condition.field === 'created_by') {
           return (
            <select
              className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
              value={condition.value}
              onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            >
              <option value="">选择用户</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
              ))}
            </select>
          );
        }
        return null;
      case 'date':
        return (
          <DatePicker
            value={condition.value}
            onChange={(date) => updateCondition(condition.id, { value: date })}
            placeholder="选择日期"
            className="w-full"
          />
        );
      case 'boolean':
        return (
          <select
            className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
            value={String(condition.value)}
            onChange={(e) => updateCondition(condition.id, { value: e.target.value === 'true' })}
          >
             <option value="true">是</option>
             <option value="false">否</option>
          </select>
        );
      default:
        return (
          <input
            type="text"
            className="block w-full border-gray-300 rounded-md shadow-sm sm:text-sm"
            value={condition.value}
            onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
            placeholder="输入关键词..."
          />
        );
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-900 flex items-center">
          <Search className="h-4 w-4 mr-2" /> 高级搜索
        </h3>
        <div className="flex space-x-2">
           {history.length > 0 && (
             <div className="relative group">
                <button className="text-gray-400 hover:text-indigo-600 flex items-center text-xs">
                  <History className="h-3 w-3 mr-1" /> 历史记录
                </button>
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-md shadow-lg hidden group-hover:block z-10">
                   <div className="p-2 text-xs text-gray-500 border-b">最近搜索</div>
                   {history.map((h, idx) => (
                     <div 
                        key={idx} 
                        className="p-2 hover:bg-gray-50 cursor-pointer text-xs truncate"
                        onClick={() => { setConditions(h); }}
                     >
                       {h.map(c => `${c.field} ${c.operator} ${c.value}`).join(', ')}
                     </div>
                   ))}
                </div>
             </div>
           )}
           <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
             <Trash2 className="h-4 w-4" />
           </button>
        </div>
      </div>

      <div className="space-y-3">
        {conditions.map((condition, index) => {
           const fieldType = FIELD_OPTIONS.find((f) => f.value === condition.field)?.type || 'text';
           return (
            <div key={condition.id} className="flex items-center space-x-2">
              {index > 0 && (
                <select
                  className="w-20 text-xs border-gray-300 rounded-md shadow-sm"
                  value={condition.logic}
                  onChange={(e) => updateCondition(condition.id, { logic: e.target.value as 'AND' | 'OR' })}
                >
                  <option value="AND">且</option>
                  <option value="OR">或</option>
                </select>
              )}
              {index === 0 && <div className="w-20 text-xs text-center text-gray-500">当</div>}
              
              <select
                className="w-32 text-sm border-gray-300 rounded-md shadow-sm"
                value={condition.field}
                onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
              >
                {FIELD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <select
                className="w-28 text-sm border-gray-300 rounded-md shadow-sm"
                value={condition.operator}
                onChange={(e) => updateCondition(condition.id, { operator: e.target.value as SearchOperator })}
              >
                {OPERATOR_OPTIONS[fieldType].map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <div className="flex-1">
                {renderValueInput(condition)}
              </div>

              <button
                onClick={() => removeCondition(condition.id)}
                className="text-gray-400 hover:text-red-600 p-1"
                disabled={conditions.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={addCondition}
          disabled={conditions.length >= 5}
          className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
        >
          <Plus className="h-4 w-4 mr-1" /> 添加条件
        </button>

        <div className="flex space-x-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4 mr-1" /> 重置
          </button>
          <button
            onClick={handleSearch}
            className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Search className="h-4 w-4 mr-1" /> 搜索
          </button>
        </div>
      </div>
    </div>
  );
};
