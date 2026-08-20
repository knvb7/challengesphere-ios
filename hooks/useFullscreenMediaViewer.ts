import { useCallback, useState } from 'react';

export function useFullscreenMediaViewer() {
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  const openViewer = useCallback((urls: string[], index = 0) => {
    const validUrls = urls.filter(Boolean);
    if (!validUrls.length) return;

    setMediaUrls(validUrls);
    setInitialIndex(Math.min(Math.max(index, 0), validUrls.length - 1));
    setVisible(true);
  }, []);

  const closeViewer = useCallback(() => {
    setVisible(false);
  }, []);

  return {
    mediaUrls,
    initialIndex,
    visible,
    openViewer,
    closeViewer,
  };
}
