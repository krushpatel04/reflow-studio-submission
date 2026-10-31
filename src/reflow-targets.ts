import { NoValidCandidateError, reflow } from './engine';
import { DesignValidationError, type Design, type Finding, type Result, type Target } from './model';
import { validateResources } from './resources';
import { InvalidMeasurementError, type Measure } from './typography';

export type TargetError = { code: string; message: string; findings?: Finding[]; total?: number };
export type TargetOutcome = { target: Target; result: Result; error?: undefined } | { target: Target; result?: undefined; error: TargetError };

/** One outcome per target, in order. A failing target never hides its siblings and its error is returned, not swallowed.
 * Source faults (identical for every target) and programming errors still throw once, loudly.
 * Per-target outcomes: unrepresentable output, invalid target, and invalid text measurements (RangeError, #27).
 */
export function reflowTargets(source: Design, targets: Target[], measure: Measure): TargetOutcome[] {
  validateResources(source);
  return targets.map(target => {
    try { return { target, result: reflow(source, target, measure) }; } catch (e) {
      if (e instanceof NoValidCandidateError) return { target, error: { code: e.code, message: e.message, findings: e.findings, total: e.total } };
      if (e instanceof DesignValidationError && e.path.startsWith('$target')) return { target, error: { code: e.code, message: e.message } };
      if (e instanceof InvalidMeasurementError) return { target, error: { code: 'runtime', message: e.message } };
      throw e;
    }
  });
}

export type TargetFailure = { target: Target; error: TargetError };
export type TargetEntry = TargetOutcome;
/** Callers that render or print per-target results: successes in order, every failure explicit. Source faults still throw once. */
export function reflowMany(source: Design, targets: Target[], measure: Measure): { results: Result[]; failures: TargetFailure[]; outcomes: TargetEntry[] } {
  const outcomes = reflowTargets(source, targets, measure);
  return { results: outcomes.flatMap(o => o.result ? [o.result] : []), failures: outcomes.flatMap(o => o.error ? [{ target: o.target, error: o.error }] : []), outcomes };
}
export function describeFailure(source: Design, failure: TargetFailure): string {
  return `${source.id}/${failure.target.id}: ${failure.error.code} ${failure.error.message}`;
}
