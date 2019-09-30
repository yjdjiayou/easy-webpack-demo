const path = require('path');
module.exports = {
    context: process.cwd(),
    mode: 'development',
    devtool: 'none',
    entry: {
        entry1: './src/entry1.js',
        entry2: './src/entry2.js'
    },
    module: {
        rules: [
            // {
            //     test: /\.css$/,
            //     use: ['style-loader', 'css-loader']
            // },
            {
                test: /\.less$/,
                use: ['style-loader', 'less-loader'],
                // use: ['style-loader', 'css-loader', 'less-loader']
            },
            // {
            //     test: /\.(js)$/,
            //     use: ['babel-loader'],
            // }
        ]
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },
    // resolveLoader: {
    //     // webpack 将会从这些目录中搜索这些 loaders
    //     modules: [path.resolve('node_modules'), path.resolve(__dirname, 'src', 'loaders')]
    // }
};