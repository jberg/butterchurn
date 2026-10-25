import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { getBrowser, closeBrowser, createPage } from './utils/puppeteer.js';
import { renderButterchurn } from './utils/renderButterchurn.js';
import TestServer from './utils/testServer.js';
import { imageSnapshotConfig } from './setup.js';

const FRAMES_TO_RENDER = 120;
const SEED1 = 12345;
const SEED2 = 54321;

describe('Butterchurn Visual Regression Tests', () => {
  let testServer;
  let serverUrl;

  const width = 800;
  const height = 600;

  beforeAll(async () => {
    testServer = new TestServer();
    await testServer.start();
    serverUrl = testServer.getUrl();
    await getBrowser();
  });

  afterAll(async () => {
    await closeBrowser();
    await testServer.stop();
  });

  const presetsSeedIndependent = [
    '_Mig_085',
    'Aderrasi - Potion of Spirits',
    'Flexi - mindblob mix',
    'Unchained - Rewop',
  ];

  const presetsSeedDependent = [
    'flexi + geiss - pogo cubes vs. tokamak vs. game of life [stahls jelly 4.5 finish]',
    'Flexi, martin + geiss - dedicated to the sherwin maxawow',
    'Geiss - Spiral Artifact',
    'martin - castle in the air',
    'martin - witchcraft reloaded',
    'yin - 191 - Temporal singularities',
  ];

  const testCases = [
    ...presetsSeedIndependent.map(preset => ({
      name: preset,
      seedIndependent: true
    })),
    ...presetsSeedDependent.map(preset => ({
      name: preset,
      seedIndependent: false
    }))
  ].sort(() => 0.5 - Math.random());

  let testAudioData;
  beforeAll(() => {
    const audioFilePath = path.join(process.cwd(), 'test/fixtures/audioAnalysisData.json');
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio analysis file not found: ${audioFilePath}\nPlease ensure audioAnalysisData.json is in the test/fixtures directory`);
    }
    testAudioData = JSON.parse(fs.readFileSync(audioFilePath, 'utf8'));
  });

  testCases.forEach(({ name, seedIndependent }) => {
    // JS preset tests (default, matches existing snapshots)
    test(`${name} - comprehensive regression test (JS)`, async () => {
      const page = await createPage();

      try {
        const audioData = testAudioData.slice(0, FRAMES_TO_RENDER);
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

        const screenshot1 = await renderButterchurn(page, serverUrl, width, height, name, audioData, FRAMES_TO_RENDER, SEED1, 'js');

        expect(screenshot1).toMatchImageSnapshot({
          ...imageSnapshotConfig,
          customSnapshotIdentifier: () => `${cleanName}-${SEED1}`
        });

        const screenshot2 = await renderButterchurn(page, serverUrl, width, height, name, audioData, FRAMES_TO_RENDER, SEED2, 'js');

        expect(screenshot2).toMatchImageSnapshot({
          ...imageSnapshotConfig,
          customSnapshotIdentifier: () => `${cleanName}-${SEED2}`
        });

        // Compare image hashes instead of raw buffers to avoid slow diff generation
        const hash1 = crypto.createHash('sha256').update(screenshot1).digest('hex');
        const hash2 = crypto.createHash('sha256').update(screenshot2).digest('hex');

        if (seedIndependent) {
          expect(hash2).toEqual(hash1);
        } else {
          expect(hash2).not.toEqual(hash1);
        }
      } finally {
        await page.close();
      }
    });

    // WASM preset tests (new, with _wasm suffix)
    test(`${name} - comprehensive regression test (WASM)`, async () => {
      const page = await createPage();

      try {
        const audioData = testAudioData.slice(0, FRAMES_TO_RENDER);
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

        const screenshot1 = await renderButterchurn(page, serverUrl, width, height, name, audioData, FRAMES_TO_RENDER, SEED1, 'wasm');

        expect(screenshot1).toMatchImageSnapshot({
          ...imageSnapshotConfig,
          customSnapshotIdentifier: () => `${cleanName}-${SEED1}_wasm`
        });

        const screenshot2 = await renderButterchurn(page, serverUrl, width, height, name, audioData, FRAMES_TO_RENDER, SEED2, 'wasm');

        expect(screenshot2).toMatchImageSnapshot({
          ...imageSnapshotConfig,
          customSnapshotIdentifier: () => `${cleanName}-${SEED2}_wasm`
        });

        // Compare image hashes instead of raw buffers to avoid slow diff generation
        const hash1 = crypto.createHash('sha256').update(screenshot1).digest('hex');
        const hash2 = crypto.createHash('sha256').update(screenshot2).digest('hex');

        if (seedIndependent) {
          expect(hash2).toEqual(hash1);
        } else {
          expect(hash2).not.toEqual(hash1);
        }
      } finally {
        await page.close();
      }
    });
  });

  // Synthetic-preset regression tests for the wave edge baseline in wave
  // modes 6 and 7 (see test/visual/test-wave.html). The baseline must come
  // from wavePosY, not wavePosX. With wave_mystery pinned to 0 the baseline
  // contributes to the rendered line, so its source is observable:
  //   mode 6: the line height must follow wave_y
  //   mode 7: the line height must not follow wave_x
  describe('wave edge baseline (modes 6 and 7)', () => {
    const hash = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');

    const renderWaveVariant = async (page, waveMode, waveX, waveY) => {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.goto(`${serverUrl}/test/visual/test-wave.html`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(async (params) => {
        window.renderComplete = false;
        await window.startWaveVisualization(params);
      }, { width, height, waveMode, waveX, waveY, audioData: testAudioData, frames: FRAMES_TO_RENDER, seed: SEED1 });
      await page.waitForFunction(() => window.renderComplete === true, { timeout: 60000 });
      return page.screenshot({ type: 'png', fullPage: false, omitBackground: true });
    };

    beforeAll(async () => {
      // The first render in a fresh browser produces slightly different
      // pixels than every subsequent render of the same input (observed with
      // swiftshader; reproducible, not random). Burn one render so both
      // measured renders below are post-warm-up and comparable.
      const page = await createPage();
      try {
        await renderWaveVariant(page, 6, 0.5, 0.5);
      } finally {
        await page.close();
      }
    });

    test('mode 6: line height follows wave_y', async () => {
      const page = await createPage();
      try {
        const low = await renderWaveVariant(page, 6, 0.8, 0.2);
        const high = await renderWaveVariant(page, 6, 0.8, 0.8);
        expect(hash(high)).not.toEqual(hash(low));
      } finally {
        await page.close();
      }
    });

    test('mode 7: line height ignores wave_x', async () => {
      const page = await createPage();
      try {
        const left = await renderWaveVariant(page, 7, 0.2, 0.8);
        const right = await renderWaveVariant(page, 7, 0.8, 0.8);
        expect(hash(right)).toEqual(hash(left));
      } finally {
        await page.close();
      }
    });
  });
});
