export type Inventory = { elements: number; copy_count: number; text_count: number };
export type ResourceStatus = { id: string; status: 'available' | 'missing'; reason: string };
export type Category = 'eligible' | 'source-defect' | 'conversion-loss' | 'missing-resource' | 'introduced-engine-defect' | 'not-assessed';
export type LedgerRow = { id: string; category: Category; reason: string; sourceInventory: Inventory | null; convertedInventory: Inventory | null; resources: ResourceStatus[]; evidence: string };
export type Ledger = { schemaVersion: string; basis: string; declaredSourceCount: number; rows: LedgerRow[] };
export function validateLedger(value: unknown): string[] {
  const errors: string[] = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['Ledger must be an object.'];
  const ledger = value as Partial<Ledger>;
  if (ledger.schemaVersion !== 'reflow.source-fidelity-ledger.v0') errors.push('Unsupported ledger schema version.');
  if (!Array.isArray(ledger.rows)) return [...errors, 'Ledger rows must be an array.'];
  if (!Number.isSafeInteger(ledger.declaredSourceCount) || ledger.declaredSourceCount !== ledger.rows.length) errors.push('Row count does not match declared source count.');
  const ids = new Set<string>();
  const reasons: Record<Category, string[]> = {
    eligible: ['preserved'], 'source-defect': ['source-defect'], 'conversion-loss': ['conversion-loss'],
    'missing-resource': ['missing-resource'], 'introduced-engine-defect': ['introduced-engine-defect'], 'not-assessed': ['input-unavailable'],
  };
  for (const raw of ledger.rows) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { errors.push('Malformed ledger row.'); continue; }
    const row = raw as LedgerRow;
    if (typeof row.id !== 'string' || !row.id.trim()) errors.push('Missing source ID.');
    else if (ids.has(row.id)) errors.push(`Duplicate source ID: ${row.id}.`);
    else ids.add(row.id);
    if (!reasons[row.category]?.includes(row.reason)) errors.push(`Invalid category or reason for ${String(row.id || '(missing ID)')}.`);
    if (!Array.isArray(row.resources) || row.resources.some(r => !r || typeof r.id !== 'string' || !r.id || !['available', 'missing'].includes(r.status) || typeof r.reason !== 'string' || !r.reason)) errors.push(`Invalid resource references or status for ${String(row.id)}.`);
    else if (new Set(row.resources.map(r => r.id)).size !== row.resources.length) errors.push(`Duplicate resource reference for ${String(row.id)}.`);
    if (row.category === 'eligible') {
      const a = row.sourceInventory, b = row.convertedInventory;
      if (!a || !b || !['elements', 'copy_count', 'text_count'].every(k => Number.isSafeInteger(a[k as keyof Inventory]) && a[k as keyof Inventory] >= 0 && a[k as keyof Inventory] === b[k as keyof Inventory])) errors.push(`Eligible inventory mismatch for ${String(row.id)}.`);
      if (row.resources?.some(r => r.status !== 'available')) errors.push(`Eligible row has unavailable resources for ${String(row.id)}.`);
    }
    if (row.category === 'missing-resource' && !row.resources?.some(r => r.status === 'missing')) errors.push(`Missing-resource row lacks a missing resource reference for ${String(row.id)}.`);
    if (row.category === 'not-assessed' && (row.sourceInventory !== null || row.convertedInventory !== null)) errors.push(`Not-assessed row must not claim inventory for ${String(row.id)}.`);
  }
  return errors;
}
