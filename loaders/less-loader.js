var less = require('less');
module.exports = function (source) {
    let css;
    less.render(source, (err, output) => {
        css = output.css;
    });
    return css;
};

/*
var less = require('less');
function loader(source){
    let callback = this.async();
    // less 实际编译时，不是异步的，这里只是看起来像异步的
    less.render(source,{filename:this.resource},(err,output)=>{
        // console.log(output.css);
        // 这里最终返回的是 css ，而不是 js
        // use:['style-loader','less-loader']
        // 在最左边的 loader 必须返回 js，中间的 loader 不用必须返回 js
        // 所以就需要用到 style-loader
        callback(err,output.css);
    });
}
module.exports = loader;*/
