import assert from "node:assert/strict";
import test from "node:test";

import {
  appendTimetableHistoryItem,
  historyStateMatches,
  redoTimetableHistoryItem,
  undoTimetableHistoryItem,
// @ts-expect-error TS5097: test-only runtime import extension.
} from "./history-stack.ts";

function item(id: string) {
  return { id, state: "ACTIVE" as const };
}

test("undo and redo follow the latest edit", () => {
  let stack = appendTimetableHistoryItem([], item("35-to-32"));
  const undone = undoTimetableHistoryItem(stack);
  stack = undone.items;
  assert.equal(undone.entry?.id, "35-to-32");
  assert.equal(stack[0].state, "UNDONE");

  const redone = redoTimetableHistoryItem(stack);
  assert.equal(redone.entry?.id, "35-to-32");
  assert.equal(redone.items[0].state, "ACTIVE");
});

test("multiple edits undo in reverse order", () => {
  let stack = appendTimetableHistoryItem([], item("35-to-32"));
  stack = appendTimetableHistoryItem(stack, item("32-to-30"));
  stack = undoTimetableHistoryItem(stack).items;
  assert.equal(stack.find((entry) => entry.id === "32-to-30")?.state, "UNDONE");
  stack = undoTimetableHistoryItem(stack).items;
  assert.equal(stack.find((entry) => entry.id === "35-to-32")?.state, "UNDONE");
  stack = redoTimetableHistoryItem(stack).items;
  assert.equal(stack.find((entry) => entry.id === "35-to-32")?.state, "ACTIVE");
});

test("a new edit supersedes the old redo branch", () => {
  let stack = appendTimetableHistoryItem([], item("35-to-32"));
  stack = appendTimetableHistoryItem(stack, item("32-to-30"));
  stack = undoTimetableHistoryItem(stack).items;
  stack = appendTimetableHistoryItem(stack, item("32-to-31"));
  assert.equal(stack.find((entry) => entry.id === "32-to-30")?.state, "SUPERSEDED");
  assert.equal(redoTimetableHistoryItem(stack).entry, null);
});

test("conflicting current state is not considered equal", () => {
  assert.equal(historyStateMatches({ HIGH: 32 }, { HIGH: 32 }), true);
  assert.equal(historyStateMatches({ HIGH: 32 }, { HIGH: 30 }), false);
});
