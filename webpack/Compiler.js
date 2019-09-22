const {
    Tapable,
    SyncHook,
    AsyncParallelHook,
    AsyncSeriesHook
} = require("tapable");
const Stats = require('./Stats');
const Compilation = require("./Compilation");
const mkdirp = require("mkdirp");
const path = require("path");

class Compiler extends Tapable {
    constructor(context) {
        super();
        // 注意参数必须是一个数组
        this.hooks = {
            environment: new SyncHook([]),
            afterEnvironment: new SyncHook([]),
            afterPlugins: new SyncHook([]),
            entryOption: new SyncHook(["context", "entry"]),
            make: new AsyncParallelHook(["compilation"]),
            beforeRun: new AsyncSeriesHook(["compiler"]),
            run: new AsyncSeriesHook(["compiler"]),
            beforeCompile: new AsyncSeriesHook(["params"]),
            compile: new SyncHook(["params"]),
            thisCompilation: new SyncHook(["compilation", "params"]),
            compilation: new SyncHook(["compilation", "params"]),
            afterCompile: new AsyncSeriesHook(["params"]),
            emit: new AsyncSeriesHook(["compilation"]),
            // 一切完成之后会触发 done 这个钩子
            done: new AsyncSeriesHook(["stats"])
        };
        this.options = {};
        // 保存当前的上下文路径（绝对路径）
        this.context = context;
    }

    emitAssets(compilation, callback) {
        const emitFiles = err => {
            // assets 要生成的资源
            let assets = compilation.assets;// {文件名字 : 源码}
            for (let file in assets) {
                // file 就是 chunk
                let source = assets[file];
                let targetPath = path.posix.join(this.options.output.path, file);
                // 把文件写到硬盘上
                this.outputFileSystem.writeFileSync(targetPath, source);
            }
            callback();
        };
        this.hooks.emit.callAsync(compilation, (err) => {
            // 创建目录
            mkdirp(this.options.output.path, emitFiles);
        });
    }

    run(finallyCallback) {
        // 编译完成后的回调
        const onCompiled = (err, compilation) => {
            this.emitAssets(compilation, err => {
                const stats = new Stats(compilation);
                this.hooks.done.callAsync(stats, err => {
                    return finallyCallback();
                });
            });
        };
        this.hooks.beforeRun.callAsync(this, err => {

            this.hooks.run.callAsync(this, err => {
                this.compile(onCompiled);
            });

        });
    }

    newCompilation(params) {
        let compilation = new Compilation(this);
        this.hooks.thisCompilation.call(compilation, params);
        this.hooks.compilation.call(compilation, params);
        return compilation;
    }

    compile(onCompiled) {
        // 开始编译前
        this.hooks.beforeCompile.callAsync({}, err => {
            this.hooks.compile.call();
            // 创建一个新的 Compilation，这里面放着本次编译的结果
            const compilation = this.newCompilation();
            // 这里会触发 SingleEntryPlugin 里面监听的 make 事件
            this.hooks.make.callAsync(compilation, err => {
                // 当入口的 chunk 解析完后，开始封包
                compilation.seal(err => {
                    // 通过模块生成代码块
                    this.hooks.afterCompile.callAsync(compilation, err => {
                        // 写入文件系统
                        return onCompiled(null, compilation);
                    });
                });
            });
        });
    }
}

module.exports = Compiler;
