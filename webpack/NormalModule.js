let fs = require('fs');
let path = require('path');
let ejs = require('ejs');
const babylon = require('babylon');
let types = require('babel-types');
let generate = require('babel-generator').default;
let traverse = require('babel-traverse').default;

class NormalModule {
    constructor({name, context, request}) {
        // chunk 名字
        this.name = name;
        this.context = context;
        // request 当前模块 的绝对路径
        this.request = request;
        // 这里放的是依赖的模块数组
        this.dependencies = [];
        // 模块 ID
        this.moduleId = '';
        // 当前依赖模块的抽象语法树 AST
        this._ast = null;
        // 源码
        this._source = null;
    }

    build(compilation) {
        // 读取 当前模块 的内容
        let originalSource = compilation.inputFileSystem.readFileSync(this.request, 'utf8');
        // 将 当前模块 的内容转换成 AST
        const ast = babylon.parse(originalSource, {
            plugins: ['dynamicImport']
        });
        // 遍历语法树，寻找要修改的目标节点
        traverse(ast, {
            // 如果当前节点是一个函数调用时
            CallExpression: (nodePath) => {
                // 当前节点是 require 时
                if (nodePath.node.callee.name === 'require') {
                    // 获取当前的节点对象
                    let node = nodePath.node;
                    // 用 __webpack_require__ 替换 require
                    node.callee.name = '__webpack_require__';
                    let moduleName = node.arguments[0].value;// 模块名 => "./title"
                    // 如果模块名没有后缀，就添加 .js 后缀名
                    let extname = moduleName.split(path.posix.sep).pop().indexOf('.') === -1 ? ".js" : "";
                    let dependencyRequest;

                    if(/.\//g.test(moduleName)){
                        // './title.js'
                        // 获取 当前模块 的依赖模块 .title.js 的所在路径  = 当前模块  所在的绝对路径 + 依赖模块名 + 后缀名
                        dependencyRequest = path.posix.join(path.posix.dirname(this.request), moduleName + extname);
                    }else{
                        // 'jquery' 在 node_modules 下的第三方库
                        // node_modules/jquery/dist/jquery.js
                        // 获取 当前模块 的依赖模块 jquery 的所在路径  = node_modules + 依赖模块名 + dist + 依赖模块名 + 后缀名
                        dependencyRequest = path.posix.join(path.posix.dirname(this.context),'node_modules', moduleName + '/dist/' + moduleName + extname);
                    }
                    // console.log('dependencyRequest=>',dependencyRequest);
                    // 获取依赖模块的模块 ID（依赖模块的所在位置——相对路径）
                    let dependencyModuleId = './' + path.posix.relative(this.context, dependencyRequest);
                    // ./src/title.js
                    // console.log('dependencyModuleId => ', dependencyModuleId);
                    this.dependencies.push({
                        // !!!!!!!!!!!!!!!!!!!!
                        // chunk 名字，不管当前是什么模块，这里都是其所属的 chunk 名字
                        // !!!!!!!!!!!!!!!!!!!!
                        name: this.name,
                        context: this.context,
                        // 当前模块 依赖的模块的绝对路径
                        request: dependencyRequest
                    });
                    // 把参数从 ./title.js 改为 ./src/title.js
                    // 改成相对于 webpack.config.js 的路径
                    node.arguments = [types.stringLiteral(dependencyModuleId)];
                }
                // 当前节点是 import() 时
                else if (types.isImport(nodePath.node.callee)) {
                    let node = nodePath.node;
                    let moduleName = node.arguments[0].value;  // 异步加载的模块名
                    let extname = moduleName.split(path.posix.sep).pop().indexOf('.') === -1 ? ".js" : "";
                    // 获取 当前模块 的依赖模块 .title.js 的绝对路径  = 当前模块  所在的绝对路径 + 依赖模块名 + 后缀名
                    let dependencyRequest = path.posix.join(path.posix.dirname(this.request), moduleName + extname);
                    let dependencyModuleId = './' + path.posix.relative(this.context, dependencyRequest);
                    let dependencyChunkId = dependencyModuleId.slice(2).replace(/(\/)/g, '_').replace(/(.js)/g, '');
                    // console.log('dependencyRequest =>',dependencyRequest);
                    // console.log('dependencyModuleId =>',dependencyModuleId);
                    // console.log('dependencyChunkId =>',dependencyChunkId);
                    // chunkId 不需要带 .js 后缀
                    nodePath.replaceWithSourceString(`
                        __webpack_require__.e("${dependencyChunkId}").then(__webpack_require__.t.bind(null,"${dependencyModuleId}",7))
                    `);
                    const isExistInAsyncChunks = compilation.asyncChunks.findIndex((chunk) => {
                        // console.log('moduleId=>', chunk.moduleId);
                        // console.log('dependencyModuleId=>',dependencyModuleId);
                        return chunk.moduleId === dependencyModuleId;
                    });
                    if(isExistInAsyncChunks < 0){
                        compilation._addAsyncModuleChain(this.context, dependencyModuleId, dependencyChunkId);
                    }
                }
            }
        });
        // 把转换后的抽象语法树重新生成代码
        let {code} = generate(ast);
        // console.log('新的 code =>', code);
        this._ast = ast;
        this.moduleId = './' + path.posix.relative(this.context, this.request);
        // 当前模块 对应的源码
        this._source = code;
        // 此时已经是编译完成了
        // 将 当前模块 添加到 compilation.modules 中
        compilation.modules.push(this);
        // 这是一个对象，key 是模块 ID（模块路径） 值是模块实例（模块内容）
        compilation._modules[this.request] = this;
        // 递归解析 当前模块 依赖的模块
        compilation.buildDependencies(this, this.dependencies);
        return this;
    }
}

module.exports = NormalModule;