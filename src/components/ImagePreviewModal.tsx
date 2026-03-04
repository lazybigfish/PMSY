/**
 * 图片预览弹窗组件
 * 支持缩放、拖拽、旋转、切换等功能
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Download, Maximize2, Minimize2 } from 'lucide-react';
import { Modal } from './Modal';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  currentIndex: number;
  onIndexChange?: (index: number) => void;
  title?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  images,
  currentIndex,
  onIndexChange,
  title = '图片预览',
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < images.length - 1;

  // 重置状态
  const resetState = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  // 切换图片时重置
  useEffect(() => {
    resetState();
  }, [currentIndex, resetState]);

  // 关闭时重置
  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  // 键盘事件
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          handlePrev();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case 'r':
          handleRotate();
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length]);

  const handlePrev = useCallback(() => {
    if (canGoPrev && onIndexChange) {
      onIndexChange(currentIndex - 1);
    }
  }, [canGoPrev, currentIndex, onIndexChange]);

  const handleNext = useCallback(() => {
    if (canGoNext && onIndexChange) {
      onIndexChange(currentIndex + 1);
    }
  }, [canGoNext, currentIndex, onIndexChange]);

  const handleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev * 1.25, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale(prev => {
      const newScale = Math.max(prev / 1.25, 0.5);
      if (newScale <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  }, []);

  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  const handleReset = useCallback(() => {
    resetState();
  }, [resetState]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleDownload = useCallback(() => {
    if (!currentImage) return;
    
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `image_${currentIndex + 1}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentImage, currentIndex]);

  // 拖拽功能
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [scale, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  }, [handleZoomIn, handleZoomOut]);

  // 双击重置
  const handleDoubleClick = useCallback(() => {
    if (scale !== 1 || rotation !== 0 || position.x !== 0 || position.y !== 0) {
      handleReset();
    } else {
      handleZoomIn();
    }
  }, [scale, rotation, position, handleReset, handleZoomIn]);

  if (!isOpen || !currentImage) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${title} (${currentIndex + 1} / ${images.length})`}
      maxWidth="7xl"
      className="!p-0"
    >
      <div 
        ref={containerRef}
        className="relative flex flex-col bg-black/95"
        style={{ height: isFullscreen ? '100vh' : '80vh' }}
      >
        {/* 工具栏 */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
          <div className="flex items-center gap-2">
            <span className="text-white/80 text-sm">
              {currentIndex + 1} / {images.length}
            </span>
            {scale > 1 && (
              <span className="text-white/60 text-xs">
                {Math.round(scale * 100)}%
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {/* 缩放控制 */}
            <button
              onClick={handleZoomOut}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="缩小 (-)"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="放大 (+)"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            
            {/* 旋转 */}
            <button
              onClick={handleRotate}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="旋转 (R)"
            >
              <RotateCw className="w-5 h-5" />
            </button>
            
            {/* 重置 */}
            {(scale !== 1 || rotation !== 0 || position.x !== 0 || position.y !== 0) && (
              <button
                onClick={handleReset}
                className="px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm"
                title="重置"
              >
                重置
              </button>
            )}
            
            <div className="w-px h-6 bg-white/20 mx-2" />
            
            {/* 下载 */}
            <button
              onClick={handleDownload}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="下载"
            >
              <Download className="w-5 h-5" />
            </button>
            
            {/* 全屏 */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="全屏 (F)"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            
            {/* 关闭 */}
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors ml-2"
              title="关闭 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 图片容器 */}
        <div 
          className="flex-1 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
        >
          <img
            ref={imageRef}
            src={currentImage}
            alt={`图片 ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain transition-transform duration-100 select-none"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            }}
            draggable={false}
          />
        </div>

        {/* 左右切换按钮 */}
        {hasMultipleImages && (
          <>
            <button
              onClick={handlePrev}
              disabled={!canGoPrev}
              className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full transition-all ${
                canGoPrev 
                  ? 'bg-black/50 text-white hover:bg-black/70' 
                  : 'bg-black/20 text-white/30 cursor-not-allowed'
              }`}
              title="上一张 (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <button
              onClick={handleNext}
              disabled={!canGoNext}
              className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full transition-all ${
                canGoNext 
                  ? 'bg-black/50 text-white hover:bg-black/70' 
                  : 'bg-black/20 text-white/30 cursor-not-allowed'
              }`}
              title="下一张 (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* 底部缩略图 */}
        {hasMultipleImages && images.length <= 10 && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex items-center justify-center gap-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => onIndexChange?.(idx)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden transition-all ${
                    idx === currentIndex 
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-black/50' 
                      : 'opacity-50 hover:opacity-80'
                  }`}
                >
                  <img
                    src={img}
                    alt={`缩略图 ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 提示文字 */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 text-white/40 text-xs pointer-events-none">
          滚轮缩放 · 拖拽移动 · 双击重置
        </div>
      </div>
    </Modal>
  );
};

export default ImagePreviewModal;
