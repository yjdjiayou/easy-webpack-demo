let path = require('path');
let fs = require('fs');

function createLoaderObject(loaderPath) {
    let obj = {data: {}};//data是用来在pitch和normal里传递数据的
    obj.request = loaderPath;//loader这个文件绝对路径
    obj.normal = require(loaderPath);//正常的loader函数
    obj.pitch = obj.normal.pitch;//pitch函数
    return obj;
}

function defineProperty(loaderContext) {
    Object.defineProperty(loaderContext, 'request', {
        get: function () {//request loader1!loader2!loader3!hello.js
            // loaderContext.resource 当前加载的资源
            return loaderContext.loaders.map(loader => loader.request).concat(loaderContext.resource).join('!');
        }
    });
    Object.defineProperty(loaderContext, 'remindingRequest', {
        get: function () {//request loader3!hello.js
            return loaderContext.loaders.slice(loaderContext.loaderIndex + 1).map(loader => loader.request).concat(loaderContext.resource).join('!');
        }
    });
    Object.defineProperty(loaderContext, 'currentRequest', {
        get: function () {//request loader2!loader3!hello.js
            return loaderContext.loaders.slice(loaderContext.loaderIndex).map(loader => loader.request).concat(loaderContext.resource).join('!');
        }
    });
    Object.defineProperty(loaderContext, 'previousRequest', {
        get: function () {//request loader1
            return loaderContext.loaders.slice(0, loaderContext.loaderIndex).map(loader => loader.request).join('!');
        }
    });
    Object.defineProperty(loaderContext, 'data', {
        get: function () {//request loader1
            return loaderContext.loaders[loaderContext.loaderIndex].data;
        }
    });
}

module.exports = function runLoaders(options, finallyCallback) {
    let loaderContext = options.context || {};//loader的上下文环境
    loaderContext.resource = options.resource;//要加载的资源 hello.js
    loaderContext.loaders = options.loaders.map(createLoaderObject);
    loaderContext.loaderIndex = 0;//loaderIndex 指的是正在执行loader的索引
    loaderContext.readResource = options.readResource;//fs.readFile
    defineProperty(loaderContext);
    let isSync = true;

    function asyncCallback(err, result) {
        isSync = true;
        loaderContext.loaderIndex--;
        iterateNormalLoaders(loaderContext, result, finallyCallback);
    }

    loaderContext.async = function () {
        isSync = false;
        return asyncCallback;
    };
    iteratePitchingLoaders(loaderContext, finallyCallback);

    function iteratePitchingLoaders(loaderContext, finallyCallback) {
        if (loaderContext.loaderIndex >= loaderContext.loaders.length) {
            loaderContext.loaderIndex--;
            // 处理模块资源
            return processResource(loaderContext, finallyCallback);
        }
        let currentLoaderObject = loaderContext.loaders[loaderContext.loaderIndex];
        let pitchFn = currentLoaderObject.pitch;
        if (!pitchFn) {
            loaderContext.loaderIndex++;
            return iteratePitchingLoaders(loaderContext, finallyCallback);
        }
        // loader1!loader2!loader3!hello.js
        // 如果当前正在执行的是 loader2
        // remindingRequest 剩余的部分：loader3!hello.js
        // previousRequest 之前的部分：loader1
        let args = pitchFn.apply(loaderContext, [
            loaderContext.remindingRequest,
            loaderContext.previousRequest,
            loaderContext.data]);
        if (args) {
            loaderContext.loaderIndex--;
            iterateNormalLoaders(loaderContext, args, finallyCallback);
        } else {
            loaderContext.loaderIndex++;
            return iteratePitchingLoaders(loaderContext, finallyCallback);
        }
    }

    function processResource(loaderContext, finallyCallback) {
        let result = loaderContext.readResource(loaderContext.resource);
        if (!loaderContext.loaders[loaderContext.loaderIndex].normal.raw) {
            result = result.toString('utf8');
        }
        iterateNormalLoaders(loaderContext, result, finallyCallback);
    }

    function iterateNormalLoaders(loaderContext, args, finallyCallback) {
        if (loaderContext.loaderIndex < 0) {
            return finallyCallback(null, args);
        }
        let currentLoaderObject = loaderContext.loaders[loaderContext.loaderIndex];
        let normalFn = currentLoaderObject.normal;
        args = normalFn.apply(loaderContext, [args]);
        if (isSync) {
            loaderContext.loaderIndex--;
            iterateNormalLoaders(loaderContext, args, finallyCallback);
        }
    }
};



/*
runLoaders({
    // 要加载的资源
    resource: path.resolve(__dirname, 'src', 'index.js'),
    // 用这三个 loader 去转换 index.js
    loaders: [
        path.resolve('loaders', 'loader1.js'),
        path.resolve('loaders', 'loader2.js'),
        path.resolve('loaders', 'loader3.js')
    ],
    context: {},
    readResource: fs.readFileSync.bind(fs)
}, function (err, result) {
    console.log(result);
});*/
