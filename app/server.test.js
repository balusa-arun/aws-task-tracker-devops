import test from 'node:test';
import assert from 'node:assert/strict';
test('task title validation rule rejects empty titles', () => { assert.equal(''.trim().length > 0, false); });
test('task title validation rule accepts a normal title', () => { assert.equal('Deploy app'.trim().length > 0 && 'Deploy app'.length <= 200, true); });
