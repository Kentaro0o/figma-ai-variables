const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = [
  // Plugin code (runs in Figma sandbox)
  {
    mode: 'production',
    entry: './src/code.ts',
    output: {
      filename: 'code.js',
      path: path.resolve(__dirname, 'dist'),
    },
    resolve: { extensions: ['.ts', '.js'] },
    module: {
      rules: [{ test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ }],
    },
  },
  // UI code (runs in iframe)
  {
    mode: 'production',
    entry: './src/ui/ui.ts',
    output: {
      filename: 'ui.js',
      path: path.resolve(__dirname, 'dist'),
    },
    resolve: { extensions: ['.ts', '.js'] },
    module: {
      rules: [
        { test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ },
        { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/ui/index.html',
        filename: 'ui.html',
        inject: 'body',
      }),
    ],
  },
];
