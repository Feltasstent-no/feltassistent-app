import { useState, useEffect } from 'react';

export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const threshold = 100;
    const check = () => {
      const diff = window.innerHeight - vv.height;
      setVisible(diff > threshold);
    };

    vv.addEventListener('resize', check);
    vv.addEventListener('scroll', check);
    return () => {
      vv.removeEventListener('resize', check);
      vv.removeEventListener('scroll', check);
    };
  }, []);

  return visible;
}
