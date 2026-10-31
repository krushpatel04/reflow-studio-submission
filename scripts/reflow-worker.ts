import { readFileSync } from 'node:fs';
import { reflow, NoValidCandidateError } from '../src/engine';
import { DesignValidationError, validateTarget } from '../src/model';
import { validateResources } from '../src/resources';

try {
  const started = performance.now();
  const request = JSON.parse(readFileSync(0, 'utf8')) as { design: string; target: unknown };
  const design: unknown = JSON.parse(request.design);
  const parsed = performance.now();
  validateResources(design);
  validateTarget(request.target);
  const validated = performance.now();
  // Native registration is deliberately after structural/resource validation.
  const { measure } = await import('./native');
  const fontsReady = performance.now();
  const result = reflow(design, request.target, measure);
  const arranged = performance.now();
  process.stdout.write(JSON.stringify({
    schemaVersion: 'reflow.cli.v0', sourceId: result.sourceId, target: result.target,
    strategy: result.selected.strategy, output: result.selected.design,
    diagnostics: result.selected.metrics, timing: {
      elapsedMs: result.elapsedMs,
      parseMs: parsed - started, validationMs: validated - parsed,
      fontSetupMs: fontsReady - validated, layoutMs: arranged - fontsReady,
      peakRssKiB: process.resourceUsage().maxRSS,
    },
  }) + '\n');
} catch (error) {
  const known = error instanceof DesignValidationError;
  const syntax = error instanceof SyntaxError;
  const noValid = error instanceof NoValidCandidateError;
  process.stderr.write(JSON.stringify({ error: {
    category: known ? error.category : syntax ? 'input' : noValid ? 'engine' : 'runtime',
    code: known ? error.code : syntax ? 'invalid-json' : noValid ? error.code : 'worker-failed',
    path: known ? error.path : '$',
    ...(noValid ? { findings: error.findings, total: error.total } : {}),
    message: error instanceof Error ? error.message : String(error),
  } }) + '\n');
  process.exitCode = known || syntax ? 2 : 1;
}
