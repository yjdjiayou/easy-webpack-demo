let EntryOptionPlugin = require('./plugins/EntryOptionPlugin');

class WebpackOptionsApply {
    process(options, compiler) {
        compiler.hooks.afterPlugins.call(compiler);
        // 挂载入口点
        new EntryOptionPlugin().apply(compiler);
        // 触发 compiler.hooks.entryOption
        compiler.hooks.entryOption.call(options.context, options.entry);
    }
}

module.exports = WebpackOptionsApply;