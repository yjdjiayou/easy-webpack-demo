class Chunk {
    constructor(module) {
        this.name = module.name;
        this.files = [];
        this.modules = [];
        if(module.isAsyncChunk){
            this.asyncModule = module;
        }else{
            this.entryModule = module;
        }
    }
}

module.exports = Chunk;