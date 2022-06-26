import { Configuration } from 'webpack'

const config: Configuration = {
  mode: 'development',
  target: 'node',
  entry: './src/index.ts',
  devtool: 'source-map',
  resolve: {
    // Add `.ts` and `.tsx` as a resolvable extension.
    extensions: ['.ts', '.tsx', '.js'],
  },
  // output: {
  //   library: {
  //     type: 'umd',
  //   },
  // },
  module: {
    rules: [
      // all files with a `.ts` or `.tsx` extension will be handled by `ts-loader`
      { test: /\.tsx?$/, loader: 'ts-loader' },
    ],
  },
  externals: {
    vue: 'Vue',
  },
  optimization: {},
}

export default config
