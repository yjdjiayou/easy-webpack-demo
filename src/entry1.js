require('./index.less');
let title = require('./title1');
let titleCommon = require('./title-common');
let $ = require('jquery');
console.log(title);
console.log($(document).attr('title'));
console.log(titleCommon);

let button = document.createElement('button');
button.innerHTML = '点我点我';
button.addEventListener('click',event=>{
    import('./async.js').then(result=>{
        console.log(result.default);
    });
});
document.body.appendChild(button);