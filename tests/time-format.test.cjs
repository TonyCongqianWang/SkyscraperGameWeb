const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const script = html.match(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/i)?.[1];
assert.ok(script, 'inline game script');
const source = script.match(/function formatTime\\(centiseconds\\)\\{[^\\n]*\\}/)?.[0];
assert.ok(source, 'time format helper');
const sandbox = vm.createContext({});
vm.runInContext(source + '\\nglobalThis.formatTime=formatTime;', sandbox);

test('stopwatch shows minutes:seconds.hundredths', () => {
  assert.equal(sandbox.formatTime(0), '00:00.00');
  assert.equal(sandbox.formatTime(1), '00:00.01');
  assert.equal(sandbox.formatTime(12345), '02:03.45');
  assert.equal(sandbox.formatTime(359999), '59:59.99');
});

test('stopwatch switches to hours:minutes:seconds.hundredths after one hour', () => {
  assert.equal(sandbox.formatTime(360000), '1:00:00.00');
  assert.equal(sandbox.formatTime(375678), '1:02:36.78');
  assert.equal(sandbox.formatTime(3600000), '10:00:00.00');
});

test('initial statistics label uses the same decimal format', () => {
  assert.match(html, /id="stat-time">00:00\\.00<\\/dd>/);
});
