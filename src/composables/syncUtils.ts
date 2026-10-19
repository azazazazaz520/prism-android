export const SYNC_TIMEOUT_MS = 10_000;

/**
 * 给网络请求加超时。离线或被中间网络拦截时，fetch 可能长时间挂起，
 * 超时后统一走离线分支
 */
export function withTimeout<T>(promise: Promise<T>, ms = SYNC_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** 判断是否为网络层失败（断网、连接被重置、超时等），用于给出可操作的提示。 */
export function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /failed to fetch|network|timeout|load failed|connection reset|err_connection|fetch failed/i.test(
    message,
  );
}
