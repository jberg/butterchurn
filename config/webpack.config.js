/*global __dirname, require, module*/

const path = require('path');
const env = require('yargs').argv.env;

const srcRoot = path.join(__dirname, '..', 'src');
const nodeRoot = path.join(__dirname, '..', 'node_modules');
const outputPath = path.join(__dirname, '..', 'lib');

let outputFile = '[name]';

if (env === 'prod') {
  outputFile += '.min';
}

const config = {
  entry: {
    butterchurn: srcRoot + '/index.js',
    butterchurnExtraImages: srcRoot + '/image/extraImageTextures.js',
    isSupported: srcRoot + '/isSupported.js',
  },
  mode: 'development',
  devtool: 'source-map',
  output: {
    path: outputPath,
    filename: outputFile + '.js',
    library: '[name]',
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    rules: [
      {
        test: /(\.js)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader?cacheDirectory',
          options: {
            plugins: ['@babel/transform-runtime'],
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /(\.js)$/,
        exclude: /node_modules/,
        use: {
          loader: 'eslint-loader'
        },
        enforce: 'pre'
      },
    ]
  },
  resolve: {
    modules: [srcRoot, nodeRoot],
    extensions: ['.js']
  },
  plugins: []
};


if (env === 'prod') {
  config.mode = 'production';
}

module.exports = config;
