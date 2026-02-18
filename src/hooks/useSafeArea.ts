import { useState, useEffect } from 'react';

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface UseSafeAreaReturn {
  insets: SafeAreaInsets;
  isSupported: boolean;
}

function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const styles = getComputedStyle(document.documentElement);

  const top = parseFloat(styles.getPropertyValue('--sat') || '0') ||
    parseFloat(styles.getPropertyValue('padding-top') || '0');
  const bottom = parseFloat(styles.getPropertyValue('--sab') || '0') ||
    parseFloat(styles.getPropertyValue('padding-bottom') || '0');
  const left = parseFloat(styles.getPropertyValue('--sal') || '0') ||
    parseFloat(styles.getPropertyValue('padding-left') || '0');
  const right = parseFloat(styles.getPropertyValue('--sar') || '0') ||
    parseFloat(styles.getPropertyValue('padding-right') || '0');

  return {
    top: top || 0,
    bottom: bottom || 0,
    left: left || 0,
    right: right || 0,
  };
}

function checkSafeAreaSupport(): boolean {
  if (typeof CSS === 'undefined' || typeof CSS.supports === 'undefined') {
    return false;
  }
  return CSS.supports('padding-top: env(safe-area-inset-top)');
}

export function useSafeArea(): UseSafeAreaReturn {
  const [insets, setInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  });
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsSupported(checkSafeAreaSupport());

    const updateInsets = () => {
      const newInsets = getSafeAreaInsets();

      const computedTop = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0'
      ) || parseFloat(
        String(getComputedStyle(document.documentElement).paddingTop || '0')
      );

      if (computedTop === 0 && checkSafeAreaSupport()) {
        const sat = getComputedStyle(document.documentElement).paddingTop;
        const sab = getComputedStyle(document.documentElement).paddingBottom;
        const sal = getComputedStyle(document.documentElement).paddingLeft;
        const sar = getComputedStyle(document.documentElement).paddingRight;

        setInsets({
          top: parseFloat(sat) || 0,
          bottom: parseFloat(sab) || 0,
          left: parseFloat(sal) || 0,
          right: parseFloat(sar) || 0,
        });
      } else {
        setInsets(newInsets);
      }
    };

    updateInsets();

    window.addEventListener('orientationchange', updateInsets);
    window.addEventListener('resize', updateInsets);

    return () => {
      window.removeEventListener('orientationchange', updateInsets);
      window.removeEventListener('resize', updateInsets);
    };
  }, []);

  return { insets, isSupported };
}
