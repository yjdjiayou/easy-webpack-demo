let NodeEnvironmentPlugin = require('./plugins/NodeEnvironmentPlugin');
let Compiler = require('./Compiler');
let WebpackOptionsApply = require('./WebpackOptionsApply');

// webpack 是一个函数，第一个参数是 options,第二个参数是 callback
function webpack(options) {
    // 上下文地址非常重要，或者是指向参数里的上下文，默认就指向当前的工作目录
    options.context = options.context || process.cwd();
    // 代表一次编译对象，全局只会有一个 compiler
    let compiler = new Compiler(options.context);
    compiler.options = options;
    // 设置 node 的环境，读写用哪个模块
    // 开发环境会用 memory-fs 来读写模块（在内存中读写）
    // 生产环境会用 fs 来读写模块（在硬盘上读写）
    new NodeEnvironmentPlugin().apply(compiler);
    // 执行所有的插件
    if (options.plugins && Array.isArray(options.plugins)) {
        options.plugins.forEach(plugin => plugin.apply(compiler));
    }
    // 触发 environment 事件执行
    compiler.hooks.environment.call();
    // 触发 afterEnvironment 事件执行
    compiler.hooks.afterEnvironment.call();
    new WebpackOptionsApply().process(options, compiler);
    return compiler;
}

module.exports = webpack;