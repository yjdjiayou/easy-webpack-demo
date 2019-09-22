const SingleEntryPlugin = require('./SingleEntryPlugin');

class EntryOptionPlugin {
    apply(compiler) {
        compiler.hooks.entryOption.tap('EntryOptionPlugin', (context, entry) => {
            // context 上下文绝对路径
            // entry 入口文件
            if (typeof entry == 'string') {
                // 处理单个入口
                // main 这个入口文件代码块的默认名称
                new SingleEntryPlugin(context, entry, 'main').apply(compiler);
            } else {
                // 处理多入口
                for (let entryName in entry) {
                    new SingleEntryPlugin(context, entry[entryName], entryName).apply(compiler);
                }
            }
        });
    }
}

module.exports = EntryOptionPlugin;