const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = [
    new CopyWebpackPlugin({
        patterns: [
            {
                from: path.resolve(__dirname, 'src', 'assets'),
                to: path.resolve(__dirname, '.webpack/renderer', 'assets')
            },
        ]
    }),
    new ForkTsCheckerWebpackPlugin(),
];
