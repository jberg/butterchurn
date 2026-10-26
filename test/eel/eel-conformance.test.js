import { describe, test, expect } from '@jest/globals';
import { formatReport, qualifiedId } from 'eel-conformance';
import { runConformanceAgainstEelWasm } from './conformanceRunner.js';
import { knownDeviations } from './knownDeviations.js';

describe('eel-wasm EEL2 conformance', () => {
  test('every corpus case passes unless listed in knownDeviations.js', async () => {
    const report = await runConformanceAgainstEelWasm();

    console.log(formatReport(report));

    const nonPassing = report.results
      .filter((result) => result.status !== 'pass')
      .map((result) => qualifiedId(result.case))
      .sort();
    const baseline = [...knownDeviations].sort();

    const regressions = nonPassing.filter((id) => !baseline.includes(id));
    const resolved = baseline.filter((id) => !nonPassing.includes(id));

    expect(regressions).toEqual([]);
    expect(resolved).toEqual([]);

    // Sanity: the corpus must not silently shrink.
    expect(report.total).toBe(82);
  });
});
