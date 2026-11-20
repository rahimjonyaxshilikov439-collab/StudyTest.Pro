import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_UNITS, filterAndSortUnits, getUnitById } from './units.ts';

test('ALL_UNITS contains exactly 100 units numbered 1..100 without gaps or duplicates', () => {
  assert.equal(ALL_UNITS.length, 100);
  for (let i = 0; i < 100; i++) {
    assert.equal(ALL_UNITS[i].id, i + 1, `Expected unit at index ${i} to have id ${i + 1}`);
  }
  assert.equal(getUnitById(1)?.title, 'Learning vocabulary');
  assert.equal(getUnitById(100)?.title, 'Abbreviations');
});

test('every unit has at least 30 unique questions with 4 distinct options and Uzbek explanations', () => {
  const seenIds = new Set<string>();

  for (const unit of ALL_UNITS) {
    assert.ok(unit.title.trim().length > 0, `Unit ${unit.id} missing title`);
    assert.ok(unit.uzbekTopic.trim().length > 0, `Unit ${unit.id} missing uzbekTopic`);
    assert.ok(unit.category.trim().length > 0, `Unit ${unit.id} missing category`);
    assert.ok(unit.keywords.length > 0, `Unit ${unit.id} missing keywords`);
    assert.ok(
      unit.questions.length >= 30,
      `Unit ${unit.id} has only ${unit.questions.length} questions (expected >= 30)`,
    );

    const unitPrompts = new Set<string>();
    for (const qItem of unit.questions) {
      assert.ok(qItem.id.trim().length > 0, `Empty question id in unit ${unit.id}`);
      assert.ok(!seenIds.has(qItem.id), `Duplicate question id: ${qItem.id}`);
      seenIds.add(qItem.id);

      assert.ok(qItem.question.trim().length > 5, `Question prompt too short in ${qItem.id}`);
      const normPrompt = qItem.question.trim().toLowerCase();
      assert.ok(!unitPrompts.has(normPrompt), `Duplicate prompt in unit ${unit.id}: ${qItem.question}`);
      unitPrompts.add(normPrompt);

      assert.equal(qItem.options.length, 4, `Question ${qItem.id} must have 4 options`);
      const trimmedOpts = qItem.options.map((o) => o.trim());
      assert.ok(
        trimmedOpts.every((o) => o.length > 0),
        `Empty option in ${qItem.id}`,
      );
      assert.equal(
        new Set(trimmedOpts.map((o) => o.toLowerCase())).size,
        4,
        `Duplicate options in ${qItem.id}: ${trimmedOpts.join(' | ')}`,
      );

      assert.ok(
        Number.isInteger(qItem.correctIndex) && qItem.correctIndex >= 0 && qItem.correctIndex <= 3,
        `Invalid correctIndex in ${qItem.id}: ${qItem.correctIndex}`,
      );
      assert.ok(
        qItem.explanationUz.trim().length > 5,
        `Missing/short explanationUz in ${qItem.id}`,
      );
    }
  }
});

test('filterAndSortUnits filters by range, status, keyword/number query and sorts properly', () => {
  const summaryMap = {
    1: {
      unitId: 1,
      attemptsCount: 1,
      bestScore: 270,
      bestPercentage: 90,
      lastPercentage: 90,
      lastAttemptAt: '2026-01-01T10:00:00.000Z',
    },
    2: {
      unitId: 2,
      attemptsCount: 1,
      bestScore: 150,
      bestPercentage: 50,
      lastPercentage: 50,
      lastAttemptAt: '2026-01-01T11:00:00.000Z',
    },
  };

  const rangeRes = filterAndSortUnits({
    query: '',
    statusFilter: 'all',
    sortMode: 'unit_asc',
    rangeId: '81-100',
    unitSummaryMap: summaryMap,
  });
  assert.equal(rangeRes.length, 20);
  assert.equal(rangeRes[0].id, 81);
  assert.equal(rangeRes[19].id, 100);

  const completedOnly = filterAndSortUnits({
    query: '',
    statusFilter: 'completed',
    sortMode: 'lowest_score',
    rangeId: 'all',
    unitSummaryMap: summaryMap,
  });
  assert.deepEqual(
    completedOnly.map((u) => u.id),
    [2, 1],
  );

  const kwMatch = filterAndSortUnits({
    query: 'RSVP',
    statusFilter: 'all',
    sortMode: 'unit_asc',
    rangeId: 'all',
    unitSummaryMap: summaryMap,
  });
  assert.ok(kwMatch.some((u) => u.id === 100));
});
