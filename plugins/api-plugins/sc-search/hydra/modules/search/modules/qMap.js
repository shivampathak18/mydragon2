var Q = require('q');

exports.qMap = function(array, fn){
    
    var dfd = Q.defer();
    var index = 0;
    
    (function next(){
        var item = array[index];
        if(index >= array.length) {
            dfd.resolve();
            return;
        }
        
        index++;
        fn(item).then(next);
        
    })();
    
    return dfd.promise;
        
};