import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { MobileTableCardProps } from './types';
import { useTouchFeedback } from '../../../hooks/useTouchFeedback';

export function MobileTableCard<T>({
  item,
  columns,
  index,
  onPress,
  onLongPress,
  renderActions,
  expandable = false,
  renderExpanded,
  className = '',
}: MobileTableCardProps<T>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [longPressTriggered, setLongPressTriggered] = useState(false);
  const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);

  const { handlers, style: feedbackStyle } = useTouchFeedback({
    feedback: 'scale',
    scale: 0.98,
  });

  // 按优先级分组列
  const highPriorityColumns = columns.filter((col) => col.priority === 'high');
  const mediumPriorityColumns = columns.filter((col) => col.priority === 'medium');
  const lowPriorityColumns = columns.filter((col) => col.priority === 'low');

  const handlePressStart = useCallback(() => {
    setLongPressTriggered(false);
    if (onLongPress) {
      longPressTimer.current = setTimeout(() => {
        setLongPressTriggered(true);
        onLongPress(item);
      }, 500);
    }
  }, [item, onLongPress]);

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (!longPressTriggered && onPress) {
      onPress(item);
    }
  }, [item, longPressTriggered, onPress]);

  const toggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`bg-white dark:bg-dark-800 rounded-xl border border-dark-100 dark:border-dark-700 overflow-hidden ${className}`}
      style={feedbackStyle}
    >
      {/* 卡片主体 */}
      <div
        className="p-4"
        onClick={handleClick}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={(e) => {
          handlers.onTouchStart(e);
          handlePressStart();
        }}
        onTouchEnd={(e) => {
          handlers.onTouchEnd(e);
          handlePressEnd();
        }}
        {...handlers}
      >
        {/* 高优先级字段 */}
        <div className="space-y-3">
          {highPriorityColumns.map((column) => (
            <div key={column.key} className="flex items-start justify-between">
              <span className="text-sm text-dark-500 dark:text-dark-400 flex-shrink-0">
                {column.title}
              </span>
              <div className="flex-1 text-right ml-4">
                {column.render ? (
                  column.render(item)
                ) : (
                  <span className="text-sm font-medium text-dark-900 dark:text-dark-100">
                    {(item as any)[column.key]}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 中优先级字段（始终显示） */}
        {mediumPriorityColumns.length > 0 && (
          <div className="mt-3 pt-3 border-t border-dark-100 dark:border-dark-700 grid grid-cols-2 gap-3">
            {mediumPriorityColumns.map((column) => (
              <div key={column.key} className={column.width === 'full' ? 'col-span-2' : ''}>
                <span className="text-xs text-dark-400 dark:text-dark-500 block mb-1">
                  {column.title}
                </span>
                <div className="text-sm text-dark-700 dark:text-dark-300">
                  {column.render ? (
                    column.render(item)
                  ) : (
                    <span>{(item as any)[column.key]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 展开/折叠按钮 */}
        {(expandable || lowPriorityColumns.length > 0) && (
          <button
            onClick={toggleExpand}
            className="w-full mt-3 pt-3 border-t border-dark-100 dark:border-dark-700 flex items-center justify-center text-sm text-primary-500 hover:text-primary-600 transition-colors min-h-touch"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                查看更多
              </>
            )}
          </button>
        )}

        {/* 展开的额外内容 */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-dark-100 dark:border-dark-700">
                {/* 低优先级字段 */}
                {lowPriorityColumns.length > 0 && (
                  <div className="space-y-2">
                    {lowPriorityColumns.map((column) => (
                      <div key={column.key} className="flex items-start justify-between">
                        <span className="text-xs text-dark-400 dark:text-dark-500 flex-shrink-0">
                          {column.title}
                        </span>
                        <div className="flex-1 text-right ml-4">
                          {column.render ? (
                            column.render(item)
                          ) : (
                            <span className="text-sm text-dark-600 dark:text-dark-400">
                              {(item as any)[column.key]}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 自定义展开内容 */}
                {renderExpanded && (
                  <div className="mt-3">{renderExpanded(item)}</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 操作按钮 */}
        {renderActions && (
          <div className="mt-3 pt-3 border-t border-dark-100 dark:border-dark-700 flex items-center justify-end gap-2">
            {renderActions(item)}
          </div>
        )}
      </div>
    </motion.div>
  );
}
