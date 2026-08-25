#!/usr/bin/env node
import { connect } from '../src/index.js';

const session = await connect();
const { editor, disconnect } = session;

const r = await editor.evaluate((appId) => {
  const editor = window.SE.launcher.getEditor(appId);
  const es = editor._editingService;
  const p = editor._papyrus;
  const out = {};

  // Reset to end of last paragraph via component store
  const comp = p._componentListStore.getComponentsByCtype('text').pop();
  const compId = comp?.id;

  // Use selection synchronizer
  try {
    p._selectionSynchronizer?.syncFromDOM?.();
    out.syncFromDOM = true;
  } catch (e) { out.syncFromDOM = e.message; }

  // Find DOM node for component
  const el = document.querySelector(`[id="${compId}"], [data-comp-id="${compId}"]`);
  out.compEl = el?.className?.slice(0, 60);

  const paras = el?.querySelectorAll?.('.se-text-paragraph') || document.querySelectorAll('.se-text-paragraph');
  const lastP = paras[paras.length - 1];
  if (lastP) {
    lastP.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    lastP.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    lastP.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    lastP.focus();
  }

  p.getSelection()?.setSelection?.(compId);
  out.isCursorMode = es.isCursorMode?.();
  out.isBlockMode = es.isBlockMode?.();

  try {
    es.write('[click-write]');
    out.write = 'ok';
  } catch (e) { out.write = e.message; }

  return out;
}, editor.appId);

console.log(JSON.stringify(r, null, 2));
await disconnect();
