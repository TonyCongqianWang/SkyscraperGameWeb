const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const html = fs.readFileSync(require("node:path").join(__dirname, "../index.html"), "utf8");
const script = html.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script, "inline game script");

test("new published API and eight difficulty levels", () => {
  assert.match(script, /\/SkyscraperSolver\/assets\/puzzles\/puzzles\.js/);
  assert.doesNotMatch(script, /puzzle-bank\/curated\/v1\/api\.js/);
  assert.match(html, /id="difficulty" type="range" min="0" max="7"/);
  const levels = [...script.matchAll(/\["(very_easy|easy|medium|hard|very_hard|extreme|extreme_plus|extreme_plus_plus)","([^"]+)"\]/g)].map(match => match[1]);
  assert.deepEqual(levels, [
    "very_easy", "easy", "medium", "hard", "very_hard",
    "extreme", "extreme_plus", "extreme_plus_plus"
  ]);
});

test("versioned puzzle ID appears and updates the shareable URL", () => {
  const source = script.match(/function setPuzzleIdentity\(id,\{preserveUrl=false\}=\{\}\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source, "puzzle identity helper");
  const element = { hidden: true, textContent: "" };
  const location = { href: "https://example.org/game/?theme=sand" };
  const window = { location, history: { replaceState: (_, __, url) => { location.href = url.href; } } };
  const context = vm.createContext({ window, URL, $: () => element });
  vm.runInContext(source + "\nglobalThis.setPuzzleIdentity = setPuzzleIdentity;", context);
  const update = context.setPuzzleIdentity;
  update("v1:7:extreme_plus:s7-p1:sample_a");
  assert.equal(element.hidden, false);
  assert.equal(element.textContent, "Puzzle ID: v1:7:extreme_plus:s7-p1:sample_a");
  assert.equal(new URL(location.href).searchParams.get("puzzle"), "v1:7:extreme_plus:s7-p1:sample_a");
  assert.equal(new URL(location.href).searchParams.get("theme"), "sand");
  update(null, { preserveUrl: true });
  assert.equal(element.hidden, true);
  assert.equal(new URL(location.href).searchParams.get("puzzle"), "v1:7:extreme_plus:s7-p1:sample_a");
  update(null);
  assert.equal(new URL(location.href).searchParams.has("puzzle"), false);
});

test("shared puzzles load by URL and retain the retry path", () => {
  assert.match(script, /new URL\(window\.location\.href\)\.searchParams\.get\("puzzle"\)/);
  assert.match(script, /loadById\(sharedId,2000,true\)/);
  assert.match(script, /\(await getApi\(\)\)\.getPuzzleById\(puzzleId\)/);
  assert.match(script, /if\(pendingPuzzleId\)return loadById\(pendingPuzzleId,10000\)/);
  assert.match(script, /if\(\/\^v1:\/\.test\(raw\)\)/);
  assert.match(script, /setPuzzleIdentity\(puzzle\.puzzle_id\|\|null\)/);
  assert.match(script, /pendingPuzzleId=null;setPuzzleIdentity\(null\)/);
});


test("startup hides local generation while waiting for a curated puzzle", () => {
  const source = script.match(/function beginStartup\(\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source, "startup function");
  const runs = [];
  const controls = {
    retry: { hidden: false },
    "source-note": { textContent: "" }
  };
  const sandbox = vm.createContext({
    window: { location: { href: "https://example.org/game/" } },
    URL,
    $: name => controls[name],
    showLocalControls: state => runs.push(["controls", state]),
    checkAvailability: timeout => runs.push(["metadata", timeout]),
    start: (timeout,initial) => runs.push(["random", timeout, initial]),
    loadById: (id,timeout,initial) => runs.push(["shared", id, timeout, initial]),
    startLocal: () => { throw Error("Must not generate locally on page load"); }
  });
  vm.runInContext(source + "\nglobalThis.startup=beginStartup;", sandbox);
  sandbox.startup();
  assert.deepEqual(runs.map(x => Array.from(x)), [
    ["controls", false], ["random", 1000, true]
  ]);
  assert.equal(controls.retry.hidden, true);
  assert.match(controls["source-note"].textContent, /Loading curated/);

  runs.length = 0;
  sandbox.window.location.href =
    "https://example.org/game/?puzzle=v1%3A7%3Aextreme_plus%3Apuzzle_42";
  sandbox.startup();
  assert.deepEqual(runs.map(x => Array.from(x)), [
    ["controls", false], ["metadata", 1000],
    ["shared", "v1:7:extreme_plus:puzzle_42", 2000, true]
  ]);
});

test("startup timeouts fall back locally and preserve shared-key retry", () => {
  assert.match(script, /async function start\(timeout=10000,initialLoad=false\)/);
  assert.match(script, /async function loadById\(puzzleId,timeout=10000,initialLoad=false(?:,fromInput=false)?\)/);
  assert.match(script, /if\(initialLoad\)\{\s*startLocal\(\)/);
  assert.match(script, /if\(initialLoad\)\{\s*startLocal\(true\)/);
  assert.match(script, /if\(pendingPuzzleId\)return loadById\(pendingPuzzleId,10000\)/);
  assert.match(script, /function retryCurated\(\)\{[\s\S]*?return start\(10000\);/);
  assert.match(script, /if\(id!==requestId\)return;/);
  assert.doesNotMatch(script, /startLocal\(Boolean\(sharedId\)\)/);
});

test("solution reveal is a synchronous toggle backed by Undo", () => {
  assert.match(script, /if\(moves\[moves\.length-1\]\?\.type==="solution"\)\{\$\("undo"\)\.click\(\);return;\}/);
  assert.match(script, /\$\("show-solution"\)\.textContent=moves\[moves\.length-1\]\?\.type==="solution"\?"Hide solution":"Show solution"/);
});
