/*global __dirname, require, module*/

const path = require('path');
const env = require('yargs').argv.env;

const srcRoot = path.join(__dirname, '..', 'src');
const nodeRoot = path.join(__dirname, '..', 'node_modules');
const outputPath = path.join(__dirname, '..', 'dist');

let outputFile = '[name]';

if (env === 'prod') {
  outputFile += '.min';
}

const config = {
  entry: {
    butterchurn: srcRoot + '/index.js',
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
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-transform-runtime'],
            sourceType: 'unambiguous'
          }
        }
      },
      {
        test: /(\.js)$/,
        exclude: /node_modules/,
        use: {
          loader: 'eslint-loader'
        },
        enforce: "pre",
      },
      {
        test: /\.ts?$/,
        use: {
          loader: path.resolve("loaders/assemblyscript.js"),
        },
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
