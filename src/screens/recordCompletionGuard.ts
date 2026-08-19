export interface RecordCompletionGuard {
  run<T>(action: () => Promise<T>): Promise<T>;
}

export function createRecordCompletionGuard(): RecordCompletionGuard {
  let inFlight: Promise<unknown> | null = null;

  return {
    run<T>(action: () => Promise<T>): Promise<T> {
      if (inFlight) return inFlight as Promise<T>;

      const current = action();
      inFlight = current;
      const clear = () => {
        if (inFlight === current) inFlight = null;
      };
      void current.then(clear, clear);
      return current;
    },
  };
}
