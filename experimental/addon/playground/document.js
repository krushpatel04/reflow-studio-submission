// Paste into the Code Playground "Document JS" tab (Add-on Mode).
import addOnSandboxSdk from "add-on-sdk-document-sandbox";
import { editor } from "express-document-sdk";

const { runtime } = addOnSandboxSdk.instance;
const TAG = "reflow.sourceId";
const OP = "reflow.lastOp";
const SOURCE_ID = "probe-1";

function walk(node, out) {
  out.push(node);
  for (const child of node.allChildren ?? []) walk(child, out);
  return out;
}

function pageNodes() {
  return walk(editor.context.currentPage, []);
}

function isTagged(node) {
  return node.addOnData?.getItem(TAG) === SOURCE_ID;
}

// Plain data only: native proxies never cross to the iframe.
function record(node) {
  const b = node.boundsInParent;
  const addOnData = {};
  for (const key of node.addOnData?.keys() ?? []) addOnData[key] = node.addOnData.getItem(key);
  return {
    id: node.id,
    type: String(node.type),
    text: node.fullContent?.text ?? null,
    bounds: b ? { x: b.x, y: b.y, width: b.width, height: b.height } : null,
    rotation: node.rotation ?? null,
    addOnData,
  };
}

runtime.exposeApi({
  createProbe(text) {
    const existing = pageNodes().filter(isTagged);
    if (existing.length > 0) return { created: false, nodes: existing.map(record) };
    const node = editor.createText(text);
    editor.context.insertionParent.children.append(node);
    node.addOnData.setItem(TAG, SOURCE_ID);
    return { created: true, nodes: [record(node)] };
  },

  // Text nodes plus anything tagged, so a lost tag is still visible by ID.
  snapshot(label) {
    const nodes = pageNodes().filter((n) => isTagged(n) || n.fullContent !== undefined);
    return { label, takenAt: new Date().toISOString(), nodes: nodes.map(record) };
  },

  // A relative move that must not apply twice for the same operation ID.
  applyMove(opId) {
    const nodes = pageNodes().filter(isTagged);
    if (nodes.length !== 1) return { applied: false, reason: `expected 1 tagged node, found ${nodes.length}` };
    const node = nodes[0];
    if (node.addOnData.getItem(OP) === opId) return { applied: false, reason: "operation already applied" };
    const t = node.translation;
    node.translation = { x: t.x + 40, y: t.y };
    node.addOnData.setItem(OP, opId);
    return { applied: true, node: record(node) };
  },
});
