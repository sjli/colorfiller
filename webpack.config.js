const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const UglifyJsPlugin = require("uglifyjs-webpack-plugin");

var IS_WDS = /webpack-dev-server/.test(process.env.npm_lifecycle_script);

module.exports = {

  mode: 'development',

  stats: {
    modules: false,
    warnings: false
  },

  devtool: 'inline-source-map',

  entry: {
    index: './src/index.js'
  },

  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      },
      {
        test: /\.(png|svg|jpg|gif)$/,
        use: {
          loader: 'file-loader',
          options: {
            publicPath: IS_WDS ? '' : 'dist'
          }
        }
      },
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },

  plugins: [
    new CleanWebpackPlugin(['dist']),
    new HtmlWebpackPlugin({
      filename: IS_WDS ? 'index.html' : '../index.html',
      template: './src/index.html'
    })
  ],

  devServer: {
    contentBase: './dist'
  },

  optimization: {
    splitChunks: {
      cacheGroups: {
        data: {
          test: /sample\-svg\-path\-data\.js$/,
          name: 'data',
          chunks: 'all'
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    },
    minimizer: [
      new UglifyJsPlugin({
        cache: true,
        parallel: true
      })
    ]
  },

  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js'
  }
};