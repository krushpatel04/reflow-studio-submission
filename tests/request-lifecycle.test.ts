import test from 'node:test';
import assert from 'node:assert/strict';
import { LayoutCache } from '../src/layout-request';

test('layout cache reuses identical source/target/font and invalidates real revisions', () => {
  const cache = new LayoutCache<{ revision: number }>(); let calls = 0;
  const run = (source = { text: 'hello' }, targets = [{ width: 100 }], font = 0) => cache.compute(source, targets, font, () => ({ revision: ++calls }));
  assert.equal(run().revision, 1); assert.equal(run().revision, 1);
  assert.equal(run({ text: 'edit' }).revision, 2);
  assert.equal(run({ text: 'edit' }, [{ width: 200 }]).revision, 3);
  assert.equal(run({ text: 'edit' }, [{ width: 200 }], 1).revision, 4);
  assert.equal(run().revision, 5); // one entry, not an unbounded history
});
test('oversized results are returned but never retained; clear releases the entry', () => {
  const cache = new LayoutCache<string>(100); let calls = 0;
  cache.compute('a', [], 0, () => 'short'); assert.ok(cache.retainedBytes > 0);
  const run = () => cache.compute('b', [], 0, () => { calls++; return 'x'.repeat(100); });
  assert.equal(run().length, 100); assert.equal(cache.retainedBytes, 0); run(); assert.equal(calls, 2);
  cache.compute('a', [], 0, () => 'short'); cache.clear(); assert.equal(cache.retainedBytes, 0);
});
test('a calculation failure does not replace the last successful cached revision', () => {
  const cache = new LayoutCache<string>();
  cache.compute('good', [], 0, () => 'saved');
  assert.throws(() => cache.compute('bad', [], 0, () => { throw new Error('failed'); }), /failed/);
  assert.equal(cache.compute('good', [], 0, () => { throw new Error('must reuse'); }), 'saved');
});

import { LayoutRequests, LayoutCancelled } from '../src/layout-request';
class FakeWorker {
  terminated = 0;
  onmessage?: (event: { data: unknown }) => void;
  onerror?: (event: unknown) => void;
  onmessageerror?: () => void;
  postMessage(_input: unknown) {}
  terminate() { this.terminated++; }
  reply(data: unknown) { this.onmessage?.({ data }); }
}
test('supersession terminates the old computation and ignores a late reply', async () => {
  const workers: FakeWorker[] = [];
  const requests = new LayoutRequests<number, string>(() => { const worker = new FakeWorker(); workers.push(worker); return worker as unknown as Worker; });
  const first = requests.run(1); const rejected = assert.rejects(first, LayoutCancelled);
  const second = requests.run(2); await rejected;
  assert.equal(workers[0].terminated, 1);
  workers[0].reply({ result: 'stale' });
  workers[1].reply({ result: 'latest' });
  assert.equal(await second, 'latest'); assert.equal(workers[1].terminated, 1);
});
test('cancel and deadline terminate work, reject visibly, and permit a new healthy request', async () => {
  const workers: FakeWorker[] = [];
  const requests = new LayoutRequests<number, string>(() => { const worker = new FakeWorker(); workers.push(worker); return worker as unknown as Worker; }, 10);
  const first = requests.run(1); const cancelled = assert.rejects(first, /cancelled/); requests.cancel(); await cancelled;
  assert.equal(workers[0].terminated, 1);
  await assert.rejects(requests.run(2), /exceeded 10 ms and was stopped/); assert.equal(workers[1].terminated, 1);
  const healthy = requests.run(3); workers[2].reply({ result: 'good' }); assert.equal(await healthy, 'good');
});
test('worker errors terminate their computation and do not prevent retry', async () => {
  const workers: FakeWorker[] = [];
  const requests = new LayoutRequests<number, string>(() => { const worker = new FakeWorker(); workers.push(worker); return worker as unknown as Worker; });
  const failed = requests.run(1); const rejected = assert.rejects(failed, /second target failed/);
  workers[0].reply({ error: 'second target failed' }); await rejected; assert.equal(workers[0].terminated, 1);
  const retried = requests.run(2); workers[1].reply({ result: 'good' }); assert.equal(await retried, 'good');
});
