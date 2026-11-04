const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script, 'game source exists');

function sourceBetween(start, end) {
  const begin = script.indexOf(start), finish = script.indexOf(end, begin + start.length);
  assert.ok(begin >= 0 && finish > begin, 'source boundaries found: ' + start);
  return script.slice(begin, finish);
}

function notesEngine() {
  const source = [
    sourceBetween('function cloneManualCandidates(source)', '\nfunction cloneInvalidCandidates(source)'),
    sourceBetween('function togglePencilMark(index,value)', '\nfunction setCell(value)')
  ].join('\n');
  const context = vm.createContext({});
  vm.runInContext(`let n=5,manualCandidates=new Map();
${source}
globalThis.api={
 toggle:togglePencilMark,
 clone:()=>cloneManualCandidates(manualCandidates),
 marks:index=>[...(manualCandidates.get(index)||[])].sort((a,b)=>a-b),
 replace:next=>{manualCandidates=next},
 size:()=>manualCandidates.size
};`, context);
  return context.api;
}

test('manual domains use the same candidate slots as automatic domains', () => {
  assert.match(html, /className="domain-digit"\+\(autoDomains\?/);
  assert.match(html, /digit\.textContent=autoDomains\|\|marked\?v:""/);
  assert.match(html, /\.domain-digit\.manual\{color:#555565/);
});

test('pencil notes toggle any height without feasibility validation', () => {
  const notes = notesEngine();
  assert.equal(notes.toggle(3,1), true);
  assert.equal(notes.toggle(3,5), true);
  assert.deepEqual([...notes.marks(3)], [1,5]);
  assert.equal(notes.toggle(3,1), false);
  assert.deepEqual([...notes.marks(3)], [5]);
  assert.equal(notes.toggle(3,5), false);
  assert.equal(notes.size(),0, 'empty sets are deleted');
  assert.equal(notes.toggle(3,6), null, 'out of range is rejected');
  assert.equal(notes.toggle(3,0), null);
  assert.equal(notes.toggle(3,2.5), null);
});

test('manual note snapshots are independently cloned for Undo Load', () => {
  const notes = notesEngine();
  notes.toggle(1,2);
  notes.toggle(1,4);
  const backup=notes.clone();
  notes.toggle(1,3);
  assert.deepEqual([...notes.marks(1)], [2,3,4]);
  notes.replace(backup);
  assert.deepEqual([...notes.marks(1)], [2,4]);
  notes.toggle(1,2);
  assert.equal(backup.get(1).has(2),false, 'restored state may be independently edited');
  assert.match(script, /manualCandidates:cloneManualCandidates\(manualCandidates\)/);
  assert.match(script, /manualCandidates=state\.manualCandidates/);
  assert.match(script, /autoDomains=state\.autoDomains;pencilMode=state\.pencilMode/);
});

test('pencil entry stays outside placement/undo history', () => {
  const cell=sourceBetween('function setCell(value)', '\nfunction showSolution()');
  assert.ok(cell.indexOf('togglePencilMark(selected,value)') < cell.indexOf('history.push(snapshotState())'));
  assert.match(cell,/if\(!autoDomains&&pencilMode\)/);
  assert.match(cell,/render\(\);setStatus\(added\?"Pencil mark added\."/);
  assert.doesNotMatch(sourceBetween('function snapshotState()', '\nfunction puzzleText()'), /manualCandidates/);
});

test('auto domains forces pen and disables pencil toggle', () => {
  assert.match(html, /id="pencil" aria-pressed="false"/);
  assert.match(html, /id="domains" aria-pressed="false"/);
  assert.doesNotMatch(html,/id="check"/);
  assert.match(script,/if\(autoDomains\)\{pencilMode=false;/);
  assert.match(script,/\(id==="pencil"&&autoDomains\)/);
  assert.match(script,/btn\.disabled=\(autoDomains\|\|!pencilMode\)&&!isValid\(r,c,v\)/);
  assert.match(script,/\(\(autoDomains\|\|!pencilMode\)&&!isValid\(r,c,v\)\)/);
});

test('new puzzles clear pencil notes while ordinary Undo does not', () => {
  assert.match(script,/function resetBoard\(\)\{grid=initial\.map\(row=>row\.slice\(\)\);manualCandidates=new Map\(\)/);
  assert.match(script,/grid=initial\.map\(row=>row\.slice\(\)\);manualCandidates=new Map\(\);invalidCandidates=new Map\(\)/);
  assert.doesNotMatch(sourceBetween('function snapshotState()', '\nfunction puzzleText()'), /manualCandidates/);
});

test('the complete inline script remains valid JavaScript', () => {
  assert.doesNotThrow(()=>new vm.Script(script));
});

test('T shortcut is highlighted and routes through the existing mode toggle', () => {
  assert.match(html, /Use Pencil \(<strong>t<\/strong>\)/);
  assert.match(script, /pencil"\)\.replaceChildren\(document\.createTextNode\(pencilMode\?"Use Pen \(":"Use Pencil \("/);
  assert.match(script, /e\.key\.toLowerCase\(\)==="t"&&!e\.ctrlKey&&!e\.metaKey&&!e\.altKey/);
  assert.match(script, /if\(!\$\("pencil"\)\.disabled\)\{e\.preventDefault\(\);if\(pencilKeyDownAt===null\)/);
  assert.match(script, /pencilKeyDownAt=performance\.now\(\);pencilKeyOriginalMode=pencilMode;\$\("pencil"\)\.click\(\)/);
});

test('tap T is permanent; hold T is temporary, without using key-repeat events', () => {
  const helper=sourceBetween('let pencilKeyDownAt=null', 'document.addEventListener("keydown"');
  assert.match(helper, /performance\.now\(\)-pencilKeyDownAt>=250/);
  assert.match(helper, /pencilMode=pencilKeyOriginalMode/);
  assert.match(script, /document\.addEventListener\("keyup",e=>\{if\(e\.key\.toLowerCase\(\)==="t"\)finishPencilKey\(\);\}\)/);
  assert.match(script, /window\.addEventListener\("blur",\(\)=>finishPencilKey\(true\)\)/);
  assert.doesNotMatch(helper,/event\.repeat|e\.repeat/);
});

test('U invokes Undo once per press and does not repeat while held', () => {
  assert.match(html, /id="undo">Undo \(<strong>u<\/strong>\)<\/button>/);
  assert.doesNotMatch(html, /↶ Undo/);
  assert.match(script, /e\.key\.toLowerCase\(\)==="u"&&!e\.ctrlKey&&!e\.metaKey&&!e\.altKey/);
  assert.match(script, /if\(!undoKeyDown\)\{undoKeyDown=true;\$\("undo"\)\.click\(\);\}/);
  assert.match(script, /if\(e\.key\.toLowerCase\(\)==="u"\)undoKeyDown=false/);
  assert.match(script, /finishPencilKey\(true\);undoKeyDown=false/);
  assert.match(script, /if\(\["TEXTAREA","INPUT","SELECT"\]\.includes\(document\.activeElement\?\.tagName\)\)return;/);
});
