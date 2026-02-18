import { useState, useCallback, useRef } from 'react';

export type TouchFeedbackType = 'scale' | 'opacity' | 'ripple' | 'none';

export interface UseTouchFeedbackOptions {
  feedback?: TouchFeedbackType;
  scale?: number;
  opacity?: number;
  duration?: number;
  disabled?: boolean;
}

export interface UseTouchFeedbackReturn {
  isPressed: boolean;
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: (e: React.TouchEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
    onMouseLeave: (e: React.MouseEvent) => void;
  };
  style: React.CSSProperties;
}

export function useTouchFeedback(
  options: UseTouchFeedbackOptions = {}
): UseTouchFeedbackReturn {
  const {
    feedback = 'scale',
    scale = 0.96,
    opacity = 0.7,
    duration = 150,
    disabled = false,
  } = options;

  const [isPressed, setIsPressed] = useState(false);
  const touchStartTime = useRef<number>(0);

  const handlePressStart = useCallback(() => {
    if (disabled) return;
    touchStartTime.current = Date.now();
    setIsPressed(true);
  }, [disabled]);

  const handlePressEnd = useCallback(() => {
    if (disabled) return;
    const pressDuration = Date.now() - touchStartTime.current;
    const minPressDuration = 100;

    if (pressDuration < minPressDuration) {
      setTimeout(() => {
        setIsPressed(false);
      }, minPressDuration - pressDuration);
    } else {
      setIsPressed(false);
    }
  }, [disabled]);

  const handlePressCancel = useCallback(() => {
    setIsPressed(false);
  }, []);

  const getStyle = (): React.CSSProperties => {
    if (disabled || feedback === 'none') {
      return {};
    }

    const baseTransition = `transform ${duration}ms ease-out, opacity ${duration}ms ease-out`;

    switch (feedback) {
      case 'scale':
        return {
          transform: isPressed ? `scale(${scale})` : 'scale(1)',
          transition: baseTransition,
        };
      case 'opacity':
        return {
          opacity: isPressed ? opacity : 1,
          transition: baseTransition,
        };
      case 'ripple':
        return {
          transform: isPressed ? `scale(${scale})` : 'scale(1)',
          opacity: isPressed ? opacity : 1,
          transition: baseTransition,
        };
      default:
        return {};
    }
  };

  return {
    isPressed,
    handlers: {
      onTouchStart: handlePressStart,
      onTouchEnd: handlePressEnd,
      onTouchCancel: handlePressCancel,
      onMouseDown: handlePressStart,
      onMouseUp: handlePressEnd,
      onMouseLeave: handlePressCancel,
    },
    style: getStyle(),
  };
}
