import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import assemblyscriptPlugin from './config/rollup-plugin-assemblyscript.js';

const isProduction = process.env.NODE_ENV === 'production';

const baseConfig = {
  plugins: [
    assemblyscriptPlugin({
      include: /\.ts$/,
    }),
    commonjs(),
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
  ],
  external: () => {
    // External dependencies that should not be bundled
    return false;
  },
};

const configs = [
  // Main butterchurn bundle
  {
    ...baseConfig,
    input: 'src/index.js',
    output: [
      {
        file: isProduction ? 'dist/butterchurn.min.js' : 'dist/butterchurn.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      ...baseConfig.plugins,
      ...(isProduction ? [terser()] : []),
    ],
  },
  // isSupported bundle
  {
    ...baseConfig,
    input: 'src/isSupported.js',
    output: [
      {
        file: isProduction ? 'dist/isSupported.min.js' : 'dist/isSupported.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      ...baseConfig.plugins,
      ...(isProduction ? [terser()] : []),
    ],
  },
];

export default configs;
