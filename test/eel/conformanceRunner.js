/**
 * Runs the portable EEL2 conformance corpus (the `eel-conformance` package)
 * against eel-wasm, the engine Butterchurn uses to execute preset equations.
 *
 * Each case is compiled with eel-wasm's `compileModule` and instantiated with
 * eel-wasm's own shims, except `rand` and `randint`, which the corpus replaces
 * with a fixed draw so the random cases are deterministic (see the
 * eel-conformance runner contract). This exercises the same compiler and
 * runtime Butterchurn ships with; only the random source differs from
 * `loadModule`.
 *
 * eel-wasm keeps megabuf/gmegabuf inside unexported WebAssembly memory, so the
 * harness's Float32Array buffers cannot be wired directly. Instead the adapter:
 *
 *   1. seeds buffer state by prepending `megabuf(i) = v` statements compiled
 *      through the engine itself, and
 *   2. reads the slots the case asserts by appending probe statements
 *      (`__p0 = megabuf(i)`), then copying the results into the harness buffers.
 *
 * Everything the case asserts therefore passes through eel-wasm's own store and
 * load paths, which is exactly the behaviour being tested.
 */
import { compileModule, shims } from 'eel-wasm';
import {
  EEL_CONFORMANCE_BUFFER_SLOTS,
  loadEelConformanceCases,
  runConformance,
} from 'eel-conformance';

const POOL_NAME = 'conformance';

/**
 * Variables the corpus expects to be prepopulated when the pool does not
 * supply them. The runner leaves these to the engine (declaring them in the
 * pool would shadow the engine's own initialization) and reads their values
 * back through probe statements.
 */
const PREPOPULATED = new Set(['pi', 'e']);

/** Matches identifiers that are not immediately called as functions. */
const VAR_TOKEN = /[a-z_][a-z0-9_]*(?!\s*\()/gi;

const f64Global = (value) =>
  new WebAssembly.Global({ value: 'f64', mutable: true }, value);

const probeName = (kind, index) => `__probe_${kind}_${index}`;

function formatValue(value) {
  return Number.isInteger(value) ? String(value) : JSON.stringify(value);
}

function preloadStatements(bufferName, buffer) {
  const statements = [];
  for (let slot = 0; slot < buffer.length; slot++) {
    if (buffer[slot] !== 0) {
      statements.push(`${bufferName}(${slot}) = ${formatValue(buffer[slot])}`);
    }
  }
  return statements;
}

function probeStatements(bufferName, slots, kind) {
  return slots.map(
    (slot, i) => `${probeName(kind, i)} = ${bufferName}(${slot})`
  );
}

function collectVariables(specCase) {
  const names = new Set();
  for (const line of specCase.program) {
    for (const match of line.matchAll(VAR_TOKEN)) {
      names.add(match[0].toLowerCase());
    }
  }
  return names;
}

function createRunner(specCase) {
  const megabufSlots = Object.keys(specCase.expectedMegabuf ?? {}).map(
    Number
  );
  const gmegabufSlots = Object.keys(specCase.expectedGmegabuf ?? {}).map(
    Number
  );
  const expectedNames = Object.keys(specCase.expected).map((key) =>
    key.toLowerCase()
  );

  return async ({ program, env, megabuf, gmegabuf, random }) => {
    // Expected variables the engine prepopulates are read through probes so
    // the engine's own initialization is what gets tested.
    const probedExpected = expectedNames.filter(
      (name) => PREPOPULATED.has(name) && !(name in env)
    );
    const pooledExpected = expectedNames.filter(
      (name) => !probedExpected.includes(name)
    );

    const statements = [
      ...preloadStatements('megabuf', megabuf),
      ...preloadStatements('gmegabuf', gmegabuf),
      ...program,
      ...probeStatements('megabuf', megabufSlots, 'mb'),
      ...probeStatements('gmegabuf', gmegabufSlots, 'gb'),
      ...probedExpected.map((name) => `${probeName('exp', name)} = ${name}`),
    ];

    const pool = {};
    const declare = (name, value) => {
      const key = name.toLowerCase();
      if (PREPOPULATED.has(key) && !(key in env)) {
        // Leave prepopulated variables to the engine.
        return;
      }
      if (!(key in pool)) {
        pool[key] = f64Global(value);
      }
    };
    for (const [key, value] of Object.entries(env)) {
      declare(key, value);
    }
    for (const name of expectedNames) {
      declare(name, 0);
    }
    for (const name of collectVariables(specCase)) {
      declare(name, 0);
    }
    megabufSlots.forEach((_, i) => declare(probeName('mb', i), 0));
    gmegabufSlots.forEach((_, i) => declare(probeName('gb', i), 0));
    probedExpected.forEach((name) => declare(probeName('exp', name), 0));

    const fixedShims = {
      ...shims,
      rand: (max) => random() * (max === undefined ? 1 : max),
      randint: (max) => Math.floor(random() * (max === undefined ? 1 : max)),
    };

    const wasmBytes = compileModule({
      pools: { [POOL_NAME]: new Set(Object.keys(pool)) },
      functions: {
        conformance: {
          pool: POOL_NAME,
          code: statements.join('; '),
        },
      },
    });

    const { instance } = await WebAssembly.instantiate(wasmBytes, {
      [POOL_NAME]: pool,
      shims: fixedShims,
    });
    instance.exports.conformance();

    for (const [key] of Object.entries(env)) {
      env[key] = pool[key].value;
    }
    for (const name of pooledExpected) {
      env[name] = pool[name].value;
    }
    for (const name of probedExpected) {
      env[name] = pool[probeName('exp', name)].value;
    }
    megabufSlots.forEach((slot, i) => {
      if (slot >= 0 && slot < EEL_CONFORMANCE_BUFFER_SLOTS) {
        megabuf[slot] = pool[probeName('mb', i)].value;
      }
    });
    gmegabufSlots.forEach((slot, i) => {
      if (slot >= 0 && slot < EEL_CONFORMANCE_BUFFER_SLOTS) {
        gmegabuf[slot] = pool[probeName('gb', i)].value;
      }
    });
  };
}

/**
 * Run the whole corpus through eel-wasm, one fresh WebAssembly instance per
 * case, and return the harness's report. Errors an individual case throws
 * (parse errors, missing builtins) are recorded on that case, not thrown.
 */
export async function runConformanceAgainstEelWasm() {
  const cases = loadEelConformanceCases();
  const buffers = {
    megabuf: new Float32Array(EEL_CONFORMANCE_BUFFER_SLOTS),
    gmegabuf: new Float32Array(EEL_CONFORMANCE_BUFFER_SLOTS),
  };

  const results = [];
  for (const specCase of cases) {
    const single = await runConformance(createRunner(specCase), {
      cases: [specCase],
      buffers,
    });
    results.push(...single.results);
  }

  const report = {
    total: results.length,
    passed: 0,
    failed: 0,
    errored: 0,
    pinnedFailures: 0,
    provisionalFailures: 0,
    results,
  };
  for (const result of results) {
    if (result.status === 'pass') {
      report.passed++;
    } else if (result.status === 'fail') {
      report.failed++;
    } else {
      report.errored++;
    }
    if (result.status !== 'pass') {
      if (result.case.status === 'provisional') {
        report.provisionalFailures++;
      } else {
        report.pinnedFailures++;
      }
    }
  }
  return report;
}
