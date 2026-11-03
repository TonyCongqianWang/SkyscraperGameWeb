const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const vm = require("node:vm");
const html = fs.readFileSync(require("node:path").join(__dirname, "../index.html"), "utf8");
const script = html.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script, "inline game script");

test("new published API and eight difficulty levels", () => {
  assert.match(script, /\/SkyscraperSolver\/assets\/puzzles\/random\.js/);
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
  assert.match(script, /if\(sharedId\)loadById\(sharedId\)/);
  assert.match(script, /\(await getApi\(\)\)\.getPuzzleById\(puzzleId\)/);
  assert.match(script, /if\(pendingPuzzleId\)return loadById\(pendingPuzzleId,10000\)/);
  assert.match(script, /if\(\/\^v1:\/\.test\(raw\)\)/);
  assert.match(script, /setPuzzleIdentity\(puzzle\.puzzle_id\|\|null\)/);
  assert.match(script, /pendingPuzzleId=null;setPuzzleIdentity\(null\)/);
});

