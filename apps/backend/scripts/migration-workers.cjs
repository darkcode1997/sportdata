async function forEachConcurrent(items, concurrency, work) {
  let next = 0;
  const results = await Promise.allSettled(Array.from({ length: Math.min(items.length, concurrency) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await work(item);
    }
  }));
  const failed = results.find(result => result.status === 'rejected');
  if (failed) throw failed.reason;
}

function migrationConcurrency(value = '4') {
  const concurrency = Number(value);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) {
    throw new Error('STORAGE_MIGRATION_CONCURRENCY must be an integer between 1 and 8');
  }
  return concurrency;
}

module.exports = { forEachConcurrent, migrationConcurrency };
