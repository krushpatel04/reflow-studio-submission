// Compares labelled snapshots from the JH-01 Express probe.
// Usage: node compare.mjs A.json B.json ... [--expect-same B-label:C-label ...]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const TAG = 'reflow.sourceId';
const FIELDS = ['text', 'bounds', 'rotation'];

function tagged(snapshot) {
  const bySource = new Map();
  for (const n of snapshot.nodes) {
    const sourceId = n.addOnData?.[TAG];
    if (sourceId === undefined) continue;
    if (!bySource.has(sourceId)) bySource.set(sourceId, []);
    bySource.get(sourceId).push(n);
  }
  return bySource;
}

function validate(snapshots, expectSame) {
  if (!Array.isArray(snapshots) || snapshots.length < 2) {
    throw new TypeError('need at least two snapshots');
  }
  const labels = new Set();
  for (const s of snapshots) {
    if (typeof s?.label !== 'string' || !Array.isArray(s.nodes)) {
      throw new TypeError(`snapshot ${JSON.stringify(s?.label)} needs a string label and a nodes array`);
    }
    if (labels.has(s.label)) throw new TypeError(`duplicate label "${s.label}"`);
    labels.add(s.label);
  }
  const trackedIds = new Set(snapshots[0].nodes
    .filter((n) => n?.addOnData?.[TAG] !== undefined).map((n) => n.id));
  for (const s of snapshots) {
    for (const n of s.nodes) {
      const sourceId = n?.addOnData?.[TAG];
      if (!n || typeof n !== 'object') throw new TypeError(`invalid node in snapshot "${s.label}"`);
      if (sourceId === undefined && !trackedIds.has(n.id)) continue;
      if ((sourceId !== undefined && (typeof sourceId !== 'string' || !sourceId.trim())) ||
          typeof n.id !== 'string' || !n.id.trim() || typeof n.text !== 'string' ||
          !['x', 'y', 'width', 'height'].every((field) => Number.isFinite(n.bounds?.[field])) ||
          !Number.isFinite(n.rotation)) {
        throw new TypeError(`invalid tracked node in snapshot "${s.label}"`);
      }
    }
  }
  for (const pair of expectSame) {
    for (const label of pair) {
      if (!labels.has(label)) throw new TypeError(`unknown label "${label}" in expectSame`);
    }
  }
  if (tagged(snapshots[0]).size === 0) {
    throw new TypeError(`first snapshot "${snapshots[0].label}" has no tagged nodes to track`);
  }
}

export function analyze(snapshots, { expectSame = [] } = {}) {
  validate(snapshots, expectSame);
  const findings = [];
  const first = tagged(snapshots[0]);
  const originalId = new Map([...first].map(([sourceId, nodes]) => [sourceId, nodes[0].id]));

  // Resolve each tracked source ID to one node per snapshot, recording identity findings.
  const resolved = snapshots.map((s) => {
    const bySource = tagged(s);
    const byId = new Map(s.nodes.map((n) => [n.id, n]));
    const picked = new Map();
    for (const [sourceId, id] of originalId) {
      const nodes = bySource.get(sourceId) ?? [];
      if (nodes.length > 1) {
        findings.push({ kind: 'duplicate', label: s.label, sourceId, ids: nodes.map((n) => n.id) });
      } else if (nodes.length === 1) {
        if (nodes[0].id !== id) {
          findings.push({ kind: 'id-changed', label: s.label, sourceId, from: id, to: nodes[0].id });
        }
      } else if (byId.has(id)) {
        findings.push({ kind: 'metadata-lost', label: s.label, sourceId, id });
      } else {
        findings.push({ kind: 'missing', label: s.label, sourceId });
      }
      const node = nodes.find((n) => n.id === id) ?? nodes[0] ?? byId.get(id);
      if (node) picked.set(sourceId, node);
    }
    return picked;
  });

  const diff = (a, b) => {
    const changes = [];
    for (const sourceId of originalId.keys()) {
      const before = a.get(sourceId);
      const after = b.get(sourceId);
      if (!before || !after) continue;
      for (const field of FIELDS) {
        if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
          changes.push({ sourceId, field, before: before[field], after: after[field] });
        }
      }
    }
    return changes;
  };

  const transitions = snapshots.slice(1).map((s, i) => ({
    from: snapshots[i].label, to: s.label, changes: diff(resolved[i], resolved[i + 1]),
  }));

  const index = new Map(snapshots.map((s, i) => [s.label, i]));
  for (const [from, to] of expectSame) {
    for (const change of diff(resolved[index.get(from)], resolved[index.get(to)])) {
      findings.push({ kind: 'unexpected-change', from, to, ...change });
    }
  }

  return { ok: findings.length === 0, findings, transitions };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const files = [];
  const expectSame = [];
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--expect-same') expectSame.push(args[++i].split(':'));
    else files.push(args[i]);
  }
  const result = analyze(files.map((f) => JSON.parse(readFileSync(f, 'utf8'))), { expectSame });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}
