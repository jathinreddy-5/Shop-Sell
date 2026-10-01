// Custom test reporter for Live Services Integration Tests
// Ensures skipped tests and their parent suites are NEVER displayed as passed.
// Formats output with live results and produces an unmistakable final summary table.

interface TestRecord {
  name: string;
  duration?: number;
  reason?: string;
  error?: string;
}

async function* liveReporter(source: any): AsyncGenerator<string, void, unknown> {
  const livePassed: TestRecord[] = [];
  const skipped: TestRecord[] = [];
  const failed: TestRecord[] = [];

  // Track state for current suite
  let currentSuiteTests: { passed: number; skipped: number; failed: number } = {
    passed: 0,
    skipped: 0,
    failed: 0,
  };

  yield '\n' + '='.repeat(88) + '\n';
  yield '           SHOP:SELL REAL SERVICES INTEGRATION SUITE (STRICT ZERO-DOCKER)\n';
  yield '='.repeat(88) + '\n\n';

  for await (const event of source) {
    if (event.type === 'test:diagnostic') {
      if (event.data?.message && typeof event.data.message === 'string') {
        const msg = event.data.message.trim();
        if (msg.includes('Concurrency') || msg.includes('Results:') || msg.startsWith('•') || msg.startsWith('✓')) {
          yield `      ℹ ${msg}\n`;
        }
      }
      continue;
    }

    if (event.type === 'test:fail') {
      const isSuite = event.data.details?.type === 'suite';
      if (!isSuite) {
        currentSuiteTests.failed++;
        const rec: TestRecord = {
          name: event.data.name,
          error: event.data.details?.error?.message || 'Unknown error',
        };
        failed.push(rec);
        yield `    ✖ [FAILED] ${event.data.name}\n`;
        if (rec.error) {
          yield `      ↳ Error: ${rec.error}\n`;
        }
      } else if (event.data.nesting === 1) {
        yield `  ✖ [FAILED SUITE] ${event.data.name}\n\n`;
        currentSuiteTests = { passed: 0, skipped: 0, failed: 0 };
      }
      continue;
    }

    if (event.type === 'test:pass') {
      const isSuite = event.data.details?.type === 'suite';
      const isSkipped = Boolean(event.data.skip);

      if (!isSuite) {
        if (isSkipped) {
          currentSuiteTests.skipped++;
          const skipReason = typeof event.data.skip === 'string' ? event.data.skip : 'Condition not met';
          skipped.push({ name: event.data.name, reason: skipReason });
          yield `    ﹣ [SKIPPED] ${event.data.name}\n`;
          yield `      ↳ Reason: ${skipReason}\n`;
        } else {
          currentSuiteTests.passed++;
          const duration = event.data.details?.duration_ms || 0;
          livePassed.push({ name: event.data.name, duration });
          yield `    ✔ [LIVE-PASSED] ${event.data.name} (${duration.toFixed(2)}ms)\n`;
        }
      } else {
        // Parent suite completed
        if (event.data.nesting === 1) {
          const suiteName = event.data.name;
          const { passed, skipped: sCount, failed: fCount } = currentSuiteTests;

          if (fCount > 0) {
            yield `  ✖ [SUITE FAILED] ${suiteName}\n\n`;
          } else if (passed > 0 && sCount === 0) {
            yield `  ✔ [SUITE LIVE-PASSED] ${suiteName} (${event.data.details?.duration_ms?.toFixed(2)}ms)\n\n`;
          } else if (passed === 0 && sCount > 0) {
            yield `  ﹣ [SUITE SKIPPED] ${suiteName} (All tests skipped — requires live credentials)\n\n`;
          } else if (passed > 0 && sCount > 0) {
            yield `  ﹣ [SUITE PARTIAL] ${suiteName} (${passed} live-passed, ${sCount} skipped)\n\n`;
          } else {
            yield `  • [SUITE] ${suiteName}\n\n`;
          }

          // Reset for next suite
          currentSuiteTests = { passed: 0, skipped: 0, failed: 0 };
        }
      }
    }
  }

  // Print final summary
  yield '='.repeat(88) + '\n';
  yield '                       FINAL INTEGRATION TEST REPORT\n';
  yield '='.repeat(88) + '\n';

  yield `\n [LIVE-PASSED] (${livePassed.length} tests against live hosted services):\n`;
  if (livePassed.length === 0) {
    yield '   (None)\n';
  } else {
    for (const t of livePassed) {
      yield `   ✔ ${t.name} (${t.duration?.toFixed(2)}ms)\n`;
    }
  }

  yield `\n [SKIPPED] (${skipped.length} tests pending external hosted credentials):\n`;
  if (skipped.length === 0) {
    yield '   (None)\n';
  } else {
    for (const t of skipped) {
      yield `   ﹣ ${t.name}\n`;
      yield `     ↳ ${t.reason}\n`;
    }
  }

  yield `\n [FAILED] (${failed.length} tests):\n`;
  if (failed.length === 0) {
    yield '   ✔ 0 test failures.\n';
  } else {
    for (const t of failed) {
      yield `   ✖ ${t.name}: ${t.error}\n`;
    }
  }

  yield '\n' + '-'.repeat(88) + '\n';
  yield ` SUMMARY:\n`;
  yield `   LIVE-PASSED : ${livePassed.length}\n`;
  yield `   SKIPPED     : ${skipped.length}\n`;
  yield `   FAILED      : ${failed.length}\n`;
  yield '='.repeat(88) + '\n\n';
}

export = liveReporter;
