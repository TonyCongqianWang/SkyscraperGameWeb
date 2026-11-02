// Run with: node --test tests/history.test.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

function engine() {
  const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
  const script = html.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/i);
  assert.ok(script, 'inline game engine script found');
  const sandbox = vm.createContext({});
  // Extract only the pure state management functions from the browser script.
  const functions = script[1].match(/function cloneInvalidCandidates\(source\)\{[^\n]*\}\nfunction snapshotState\(\)\{[^\n]*\}\nfunction restoreState\(state\)\{[^\n]*\}/);
  assert.ok(functions, 'state-stack helpers found');
  vm.runInContext('let grid=[[0,0],[0,0]], invalidCandidates=new Map();\n' + functions[0] + '\n' +
    'globalThis.api={snapshotState,restoreState,setGrid:x=>grid=x,exclude:(i,v)=>{if(!invalidCandidates.has(i))invalidCandidates.set(i,new Set());invalidCandidates.get(i).add(v)},has:(i,v)=>invalidCandidates.get(i)?.has(v)??false,grid:()=>grid};', sandbox);
  return sandbox.api;
}

test('backtracking restores exclusions at each parent depth without sharing Sets', () => {
  const e = engine();
  const root = e.snapshotState();
  e.setGrid([[1,0],[0,0]]);
  const parent = e.snapshotState();
  e.exclude(1,2); // child contradiction
  e.restoreState(parent);
  e.exclude(1,2); // exclusion belongs to parent, not ancestor
  assert.equal(e.has(1,2),true);
  const sibling = e.snapshotState();
  e.exclude(1,1);
  e.restoreState(sibling);
  assert.equal(e.has(1,1),false, 'sibling mutation does not leak');
  assert.equal(e.has(1,2),true, 'parent retains failed-child exclusion');
  e.restoreState(root);
  assert.equal(e.has(1,2),false, 'grandparent domain restored');
  assert.equal(e.grid()[0][0],0, 'grandparent grid restored');
});
