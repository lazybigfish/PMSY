import { useState, useEffect } from 'react';

export interface UseMobileDetectReturn {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWechat: boolean;
  userAgent: string;
}

function detectMobile(userAgent: string): boolean {
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent);
}

function detectTablet(userAgent: string): boolean {
  const tabletRegex = /iPad|Android(?!.*Mobile)|Tablet/i;
  return tabletRegex.test(userAgent);
}

function detectTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function detectIOS(userAgent: string): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent);
}

function detectAndroid(userAgent: string): boolean {
  return /Android/i.test(userAgent);
}

function detectWechat(userAgent: string): boolean {
  return /MicroMessenger/i.test(userAgent);
}

export function useMobileDetect(): UseMobileDetectReturn {
  const [state, setState] = useState<UseMobileDetectReturn>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    isIOS: false,
    isAndroid: false,
    isWechat: false,
    userAgent: '',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent;
    const isMobile = detectMobile(userAgent);
    const isTablet = detectTablet(userAgent);
    const isTouchDevice = detectTouchDevice();
    const isIOS = detectIOS(userAgent);
    const isAndroid = detectAndroid(userAgent);
    const isWechat = detectWechat(userAgent);

    setState({
      isMobile,
      isTablet,
      isDesktop: !isMobile && !isTablet,
      isTouchDevice,
      isIOS,
      isAndroid,
      isWechat,
      userAgent,
    });
  }, []);

  return state;
}
