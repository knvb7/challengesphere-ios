import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import {
  isPresignedS3MediaUrl,
  isSignedMediaQueryKey,
} from '../utils/signedMediaRefresh';

let activeRecoveryRefresh: Promise<void> | null = null;

export function useSignedMediaRecovery() {
  const queryClient = useQueryClient();
  const attemptedUrlsRef = useRef(new Set<string>());

  return useCallback((uri?: string | null) => {
    if (!uri || !isPresignedS3MediaUrl(uri) || attemptedUrlsRef.current.has(uri)) {
      return;
    }

    attemptedUrlsRef.current.add(uri);

    if (!activeRecoveryRefresh) {
      activeRecoveryRefresh = queryClient.invalidateQueries({
        predicate: (query) => isSignedMediaQueryKey(query.queryKey),
        refetchType: 'active',
      })
        .catch(() => undefined)
        .finally(() => {
          activeRecoveryRefresh = null;
        });
    }

    void activeRecoveryRefresh;
  }, [queryClient]);
}
