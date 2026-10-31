/** One current layout entry, bounded by its serialized UTF-16 payload. Presentation
 * mode/overlays are deliberately absent from the key; source, targets and fonts are not. */
export class LayoutCache<T> {
  private entry?: { key: string; value: T; bytes: number };
  constructor(readonly maxBytes = 4 * 1024 * 1024) {}
  clear() { this.entry = undefined; }
  get retainedBytes() { return this.entry?.bytes ?? 0; }
  compute(source: unknown, targets: unknown, fontRevision: number, calculate: () => T): T {
    const key = JSON.stringify([source, targets, fontRevision]);
    if (this.entry?.key === key) return this.entry.value;
    const value = calculate();
    const bytes = 2 * (key.length + JSON.stringify(value).length);
    this.entry = bytes <= this.maxBytes ? { key, value, bytes } : undefined;
    return value;
  }
}

export class LayoutCancelled extends Error {}
/** Owns one interruptible computation. A terminated worker can never commit a reply. */
export class LayoutRequests<Input, Output> {
  private active?: { worker: Worker; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
  constructor(private readonly createWorker: () => Worker, readonly deadlineMs = 10_000) {}
  cancel(message = 'Layout cancelled') {
    const active = this.active;
    if (!active) return;
    this.active = undefined;
    clearTimeout(active.timer);
    active.worker.terminate();
    active.reject(new LayoutCancelled(message));
  }
  run(input: Input, onProgress?: (stage: string) => void): Promise<Output> {
    this.cancel('Superseded by a newer request');
    return new Promise((resolve, reject) => {
      const worker = this.createWorker();
      const finish = (error?: Error, value?: Output) => {
        if (this.active?.worker !== worker) return;
        clearTimeout(this.active.timer);
        this.active = undefined;
        worker.terminate();
        if (error) reject(error); else resolve(value!);
      };
      const timer = setTimeout(() => finish(new Error(`Layout exceeded ${this.deadlineMs} ms and was stopped`)), this.deadlineMs);
      this.active = { worker, reject, timer };
      worker.onmessage = event => {
        if (this.active?.worker !== worker) return;
        if (event.data.stage) { onProgress?.(event.data.stage); return; }
        if (event.data.error) finish(new Error(event.data.error));
        else if (event.data.result !== undefined) finish(undefined, event.data.result);
        else finish(new Error('Layout worker returned no result'));
      };
      worker.onerror = event => { event.preventDefault(); finish(new Error(event.message || 'Layout worker failed')); };
      worker.onmessageerror = () => finish(new Error('Layout worker returned an unreadable result'));
      try { worker.postMessage(input); } catch (error) { finish(error instanceof Error ? error : new Error(String(error))); }
    });
  }
}
