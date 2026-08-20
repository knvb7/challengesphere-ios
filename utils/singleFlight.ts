export const createSingleFlight = <T>(operation: () => Promise<T>) => {
  let inFlight: Promise<T> | null = null;

  return async (): Promise<T> => {
    if (!inFlight) {
      inFlight = operation();
    }

    const activeOperation = inFlight;
    try {
      return await activeOperation;
    } finally {
      if (inFlight === activeOperation) {
        inFlight = null;
      }
    }
  };
};
