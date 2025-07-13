import { expect } from '@jest/globals';
import { toMatchImageSnapshot } from 'jest-image-snapshot';

expect.extend({ toMatchImageSnapshot });

export const imageSnapshotConfig = {
  // Expect pixel-perfect matches (0% tolerance)
  failureThreshold: 0,
  failureThresholdType: 'pixel',

  customDiffConfig: {
    threshold: 0,
    includeAA: false,
  },

  blur: 0,

  storeReceivedOnFailure: true,

  customSnapshotIdentifier: ({ currentTestName, counter }) => {
    const testName = currentTestName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    return `${testName}-${counter}`;
  }
};
