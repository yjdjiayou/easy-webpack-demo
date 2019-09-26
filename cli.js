let webpack = require("./webpack");
let webpackOptions = require("./webpack.config");

const compiler = webpack(webpackOptions);
compiler.run((err, stat) => {
    // console.log('err => ', err);
    console.log('stat => ', stat);
});
