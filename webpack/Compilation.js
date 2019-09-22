const path = require('path');
const ejs = require('ejs');
const fs = require('fs');
const {
    Tapable,
    SyncHook,
    AsyncParallelHook,
    AsyncSeriesHook
} = require("tapable");
const Chunk = require('./Chunk');
let normalModuleFactory = require('./NormalModuleFactory');


// webpack 最终打包生成代码套用的模板
// 同步加载的模块模板
const mainTemplate = fs.readFileSync(path.posix.join(__dirname, 'template', 'main.ejs'), 'utf8');
// 异步加载的模块模板
const chunkTemplate = fs.readFileSync(path.posix.join(__dirname, 'template', 'chunk.ejs'), 'utf8');
const mainRender = ejs.compile(mainTemplate);
const chunkRender = ejs.compile(chunkTemplate);

class Compilation extends Tapable {
    constructor(compiler) {
        super();
        this.compiler = compiler;
        this.options = compiler.options;
        this.context = compiler.context;
        this.inputFileSystem = compiler.inputFileSystem;
        this.outputFileSystem = compiler.outputFileSystem;
        this.hooks = {
            addEntry: new SyncHook(['entry', 'name']),
            seal: new SyncHook([]),
            beforeChunks: new SyncHook([]),
            afterChunks: new SyncHook([])
        };

        // 存放所有的入口模块
        this.entries = [];
        // 存放异步加载的 chunk
        this.asyncChunks = [];
        // 存放所有的 chunk （包括入口 chunk 和异步加载的 chunk）
        this.chunks = [];
        // 存放所有的模块（包括入口 chunk 及其所依赖的模块）
        this.modules = [];
        // 这是一个对象，key 是模块 ID（模块的绝路径） 值是模块实例（模块内容）
        this._modules = {};
        // 文件数组
        this.files = [];
        // 资源对象，里面存放最终要产出的文件
        this.assets = {};
    }

    addEntry(context, entry, name, finallyCallback) {
        this.hooks.addEntry.call(entry, name);// ./src/index.js , main
        this._addModuleChain(context, entry, name);
        finallyCallback();
    }

    _addModuleChain(context, entry, name) {
        let module = normalModuleFactory.create({
            // chunk 名字，单入口 chunk 名字默认为 main
            name,
            context: this.context,
            // 当前入口 chunk 的绝对路径
            request: path.posix.join(context, entry)
        });
        module.build(this);
        // 把编译后的入口模块添加到入口数组
        this.entries.push(module);
    }

    _addAsyncModuleChain(context, asyncChunk, name) {
        let module = normalModuleFactory.create({
            name,
            context: this.context,
            request: path.posix.join(context, asyncChunk)
        });
        module.isAsyncChunk = true;
        module.build(this);
        this.asyncChunks.push(module);
    }

    buildDependencies(module, dependencies) {
        module.dependencies = dependencies.map(data => {
            let childModule = normalModuleFactory.create(data);
            return childModule.build(this);
        });
    }

    seal(callback) {
        this.hooks.seal.call();
        this.hooks.beforeChunks.call();
        for (let entryModule of this.entries) {
            let chunk = new Chunk(entryModule);
            this.chunks.push(chunk);
            // 只要当前模块的 name 和当前 chunk 名字一样，就说明这个模块属于这个 chunk
            chunk.modules = this.modules.filter(module => module.name === chunk.name);
        }
        for (let asyncModule of this.asyncChunks) {
            let chunk = new Chunk(asyncModule);
            this.chunks.push(chunk);
            // 只要当前模块的 name 和当前 chunk 名字一样，就说明这个模块属于这个 chunk
            chunk.modules = this.modules.filter(module => module.name === chunk.name);
        }
        this.hooks.afterChunks.call();
        this.createChunkAssets();
        callback();
    }

    createChunkAssets() {
        for (let i = 0; i < this.chunks.length; i++) {
            const chunk = this.chunks[i];
            chunk.files = [];
            const file = chunk.name + '.js';
            let source;
            if(chunk.entryModule){
                source = mainRender({
                    entryChunkId: chunk.entryModule.moduleId,// 入口模块 ID
                    entryChunkName: chunk.name,// 入口模块名字
                    modules: chunk.modules
                });
            }else{
                source = chunkRender({
                    asyncChunkId: chunk.asyncModule.moduleId,// 异步模块 ID
                    asyncChunkName: chunk.name,// 异步模块名字
                    modules: chunk.modules
                });
            }

            chunk.files.push(file);
            this.emitAsset(file, source);
        }
    }

    emitAsset(file, source) {
        this.assets[file] = source;
        this.files.push(file);
    }
}

module.exports = Compilation;
