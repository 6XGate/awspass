const { resolve } = require('path')
const { BannerPlugin } = require('webpack')
const WebpackBarPlugin = require('webpackbar')
const WebpackNotifierPlugin = require('webpack-notifier')
const nodeExternals = require('webpack-node-externals')

const esmModules = [
  'env-paths'
]

module.exports = {
  target: 'node14',
  entry: './src/main.ts',
  output: {
    filename: 'aws-credentials.cjs',
    path: resolve(__dirname, 'bin')
  },
  module: {
    rules: [
      // TypeScript
      {
        test: /\.tsx?$/u,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: { extensions: ['.tsx', '.ts', '.js'] },
  plugins: [
    new BannerPlugin({ banner: '#!/usr/bin/env node', raw: true, entryOnly: true }),
    new WebpackBarPlugin({ profile: true }),
    new WebpackNotifierPlugin()
  ],
  stats: { preset: 'errors-warnings', assets: true, colors: true },
  externalsPresets: { node: true },
  externals: [nodeExternals({
    importType: name => esmModules.includes(name) ? `module ${name}` : `commonjs ${name}`
  })],
  experiments: { topLevelAwait: true },
  devtool: 'inline-source-map',
}
