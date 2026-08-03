import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTO_ARCHIVE_DAYS, shouldAutoArchiveBatch, getArchivedBatchRows, getArchivedMedicineRows } from './archiveBackend.js';

test('auto archive triggers after 30 days of depletion', () => {
  const now = new Date('2026-08-03T12:00:00Z');
  const oldBatch = {
    quantity: 0,
    depletedAt: new Date('2026-06-01T12:00:00Z').toISOString(),
  };
  assert.equal(shouldAutoArchiveBatch(oldBatch, now), true);
  assert.equal(shouldAutoArchiveBatch({ quantity: 5, depletedAt: new Date('2026-06-01T12:00:00Z').toISOString() }, now), false);
  assert.equal(shouldAutoArchiveBatch({ quantity: 0, depletedAt: new Date('2026-07-20T12:00:00Z').toISOString() }, now), false);
  assert.equal(AUTO_ARCHIVE_DAYS, 30);
});

test('archived batch and medicine rows are grouped for the archive view', () => {
  const medicines = [
    {
      id: 'med-1',
      name: 'Biogesic',
      brandName: 'Paracetamol',
      category: 'Painkiller',
      archivedBatches: [{ batchNumber: 'B-001', quantity: 0, archiveReason: 'Out of Stock', archivedAt: '2026-08-01T00:00:00Z' }],
    },
    {
      id: 'med-2',
      name: 'Amoxil',
      brandName: 'Amoxicillin',
      category: 'Antibiotic',
      isArchived: true,
      archivedAt: '2026-08-02T00:00:00Z',
      archiveReason: 'Discontinued',
    },
  ];

  const batchRows = getArchivedBatchRows(medicines);
  const medicineRows = getArchivedMedicineRows(medicines);

  assert.equal(batchRows.length, 1);
  assert.equal(batchRows[0].batchNumber, 'B-001');
  assert.equal(medicineRows[0].genericName, 'Amoxil');
});
