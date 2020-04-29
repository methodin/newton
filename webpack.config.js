const path = require('path');

const webpackConfig = {
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js'],
    modules: [
      path.resolve('./src'),
      './node_modules'
    ]
  }
};

module.exports = webpackConfig;
