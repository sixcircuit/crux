
var windows = {};

windows.focus_window = function(window_id, callback){
    callback = callback || _.noop;
    if(window_id === null){ return callback(); }

    chrome.windows.get(window_id, function(win){
        if(!win){ return callback(false); }
        chrome.windows.update(window_id, { focused: true }, function(){ callback(true); });
    });
};

function tab_library(){};

tab_library.prototype.focus_tab = function(window_id, tab_id, callback){
    this.activate_tab(tab_id, function(){
        chrome.windows.update(window_id, { focused: true }, function(){
            if(callback){ callback(); }
        })   
    });
}

tab_library.prototype.activate_tab = function(tab_id, callback){ 
    callback = callback || _.noop;
    chrome.tabs.update(tab_id, { active: true }, callback);
};

tab_library.prototype.activate_tab_with_offset = function(offset, callback){
    var self = this;

    chrome.tabs.query({ currentWindow: true }, function(tabs){
        var active = _.find(tabs, function(t){ return(t.active); });
        if(!active){ return callback(); }

        var next_index = (active.index + offset) % tabs.length;
        if(next_index < 0){ next_index = tabs.length + next_index; }

        self.activate_tab(tabs[next_index].id, callback);
    });
}

var tabs = new tab_library();

