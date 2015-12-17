"use strict";

_.log.level("debug");

function application_window(url){
    var self = this;

    this._url = url;
    this._window_id = null;
    this._last_window_id = null;
    this._type = "popup";
    this._height = screen.availHeight;
    this._width = screen.availWidth;
    this._focused = false;

    chrome.windows.onFocusChanged.addListener(function(window_id){
        _.log.debug("focus changed handler");
        if(self._creating){ return; }
        if(window_id !== self.window_id()){
            self._last_window_id = window_id;
            self._focused = false;
        }else{
            self._focused = true;
        }
    });

    chrome.windows.onRemoved.addListener(function(window_id){
        if(window_id === self.window_id()){
            self._window_id = null;
            self._focused = false;
        }
    });
}

application_window.prototype.url = _.r("_url");
application_window.prototype.type = _.r("_type");
application_window.prototype.height = _.r("_height");
application_window.prototype.width = _.r("_width");
application_window.prototype.focused = _.r("_focused");
application_window.prototype.window_id = _.r("_window_id");
application_window.prototype.last_window_id = _.r("_last_window_id");

application_window.prototype.create = function(callback){
    _.log.debug("application_window.", "create");

    var self = this;
    callback = callback || _.noop;

    var options = {
        url: chrome.extension.getURL(self.url()), 
        type: self.type(),
        left: 1,
        top:1,
        width: self.width(),
        height: self.height(),
        focused: true
    };

    self._creating = true;
    chrome.windows.create(options, function(result){
        _.log.debug("create callback");
        self._creating = false;
        self._focused = true;
        self._window_id = result.id;

        if(result.height !== options.height){
            chrome.windows.update(result.id, { width: options.width, height: options.height }, callback);
        }else{ callback(); }
    });
};

application_window.prototype.front = function(callback){
    _.log.debug("application_window.", "front");
    var self = this;

    if(!self.window_id()){ return self.create(callback); }

    windows.focus_window(self.window_id(), callback);
};

application_window.prototype.show = application_window.prototype.front;

application_window.prototype.back = function(callback){
    _.log.debug("application_window.", "back: ", this.last_window_id());
    windows.focus_window(this.last_window_id(), callback);
};

application_window.prototype.close = function(callback){
    chrome.windows.remove(this.window_id(), callback); 
    this._window_id = null;
}

application_window.prototype.minimize = function(callback){
    var self = this;

    callback = callback || _.noop;
    if(self.window_id() === null){ return callback(); }

    chrome.windows.get(self.window_id(), function(win){
        chrome.windows.update(self.window_id(), { state: "minimized" }, callback);
    });
}

var tab_window = new application_window("popup.html");

function toggle_window(){
    _.log.debug("toggle_window");
    _.log.debug("tab_window.focused(): ", tab_window.focused());

    if(!tab_window.focused()){ 
        tab_window.front();
    }else{ 
        tab_window.back();
    }
}

function find_next_window(wins){

    _.log.debug(wins);

    var current_window_index = 0;
    _.find(wins, function(w){
        if(w.focused){ return(true); }
        current_window_index++;
    });

    wins = _.concat(wins.slice(current_window_index), wins.slice(0, current_window_index));

    var current = wins.shift();

    var next = _.find(wins, function(w){
        return(w.state != "minimized" && w.id != tab_window.window_id());
    });

    return(next);
}

function next_window(){
    chrome.windows.getAll(function(wins){
        var next = find_next_window(wins);
        windows.focus_window(next.id);
    });
}

function next_tab(){ tabs.activate_tab_with_offset(1); }
function previous_tab(){ tabs.activate_tab_with_offset(-1); }

chrome.browserAction.onClicked.addListener(function(event){
    _.log.debug("browserAction");
    // toggle_window();
});

chrome.commands.onCommand.addListener(function(command) {
    if(command === "toggle_tab_list"){ toggle_window(); }
    else if(command === "next_window"){ next_window(); }
    else if(command === "next_tab"){ next_tab(); }
    else if(command === "previous_tab"){ previous_tab(); }
});

/*
if(localStorage.restore_in_last_position && localStorage.last_position){
    try{ 
        var last_position = JSON.parse(localStorage.last_position);
        tab_window.top(last_position.top);
        tab_window.left(last_position.left);
        tab_window.height(last_position.height);
        tab_window.width(last_position.width);
    }catch(k){}
}
*/
  
