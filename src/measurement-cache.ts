import type { TextElement } from './model';
import type { Measure } from './typography';

type Metrics = ReturnType<Measure>;
type Capacity = { entries: number; codeUnits: number };
const DEFAULT_CAPACITY: Capacity = { entries: 4096, codeUnits: 262144 };

/** Engine-local, operation-scoped memoization. Element objects must remain immutable
 * while measured, and the callback must be deterministic and must not mutate inputs.
 * Identity keys preserve every element property as part of the measurement context.
 * FIFO ceilings bound retained query strings/entries, not total heap or execution time.
 */
export function cacheMeasurements(measure: Measure, capacity: Capacity = DEFAULT_CAPACITY): Measure {
  const { entries, codeUnits } = capacity;
  if (![entries, codeUnits].every(n => Number.isSafeInteger(n) && n >= 0)) {
    throw new RangeError('Measurement cache capacity must use nonnegative safe integers.');
  }
  if (!entries || !codeUnits) return measure;
  const contexts = new WeakMap<TextElement, Map<string, Metrics>>();
  // Queue entries hold query maps, never their element keys. WeakMap contexts can
  // disappear when fitting moves on; the queue itself is bounded by both ceilings.
  const queue = new Set<{ values: Map<string, Metrics>; text: string }>();
  let retainedCodeUnits = 0;
  return (text, element) => {
    let values = contexts.get(element);
    const hit = values?.get(text);
    if (hit) return { ...hit };
    const result = measure(text, element);
    if (text.length > codeUnits || ![result.width, result.ascent, result.descent].every(n => Number.isFinite(n) && n >= 0)) return result;
    while (queue.size >= entries || retainedCodeUnits + text.length > codeUnits) {
      const oldest = queue.values().next().value!;
      oldest.values.delete(oldest.text);
      retainedCodeUnits -= oldest.text.length;
      queue.delete(oldest);
    }
    if (!values) contexts.set(element, values = new Map());
    const saved = { ...result };
    values.set(text, saved);
    queue.add({ values, text });
    retainedCodeUnits += text.length;
    return { ...saved };
  };
}
