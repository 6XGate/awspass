const { chmod, stat } = require('node:fs/promises')
const { normalize, resolve } = require('node:path')
const { BannerPlugin } = require('webpack')
const nodeExternals = require('webpack-node-externals')
const WebpackNotifierPlugin = require('webpack-notifier')
const WebpackBarPlugin = require('webpackbar')

// These modules are ES6 modules that require import()
const esmModules = ['execa', 'env-paths']

/**
 * @param env {Object.<string, *>}
 * @param argv {Object.<string, *>}
 * @returns {import('webpack').Configuration}
 */
module.exports = (env, argv) => ({
  target: 'node14',
  entry: './src/main.ts',
  output: {
    // $PROJECTDIR/bin/awspass.cjs
    filename: 'awspass.cjs',
    path: resolve(__dirname, 'bin')
  },
  module: {
    rules: [
      // TypeScript support
      {
        test: /\.tsx?$/u,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: { extensions: ['.tsx', '.ts', '.js'] },
  plugins: [
    // Append a node shebang.
    new BannerPlugin({ banner: '#!/usr/bin/env node', raw: true, entryOnly: true }),
    // Fancy progress bars.
    new WebpackBarPlugin({ profile: true }),
    // Desktop notification when done.
    new WebpackNotifierPlugin(),
    // Make the program executable.
    compiler => {
      compiler.hooks.done.tapPromise('AfterPlugin', async stats => {
        const binPath = normalize(resolve(
          stats.compilation.outputOptions.path,
          stats.compilation.outputOptions.filename
        ))
        const binStat = await stat(binPath)
        await chmod(binPath, (binStat.mode | 0o111) & 0o777)
      })
    }
  ],
  // Only show compiled assets and build time.
  stats: { preset: 'errors-warnings', assets: true, colors: true },
  // Make sure all node modules and npm packages are not bundled.
  externalsPresets: { node: true },
  externals: [nodeExternals({
    importType: name => esmModules.includes(name) ? `module ${name}` : `commonjs ${name}`
  })],
  // Allow top-level await.
  experiments: { topLevelAwait: true },
  // Add source maps.
  devtool: argv.mode === 'development' ? 'source-map' : undefined,
  // Minification
  optimization: { minimize: argv.mode === 'production' }
})
