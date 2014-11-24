"use strict";

_.log.level("debug");

function tag_fun(tag){
    return(function(){
        var result = "";
        _.each(arguments, function(s){ result += s; });
        return("<" + tag + ">" + result + "</" + tag + ">");
    });
}

var tr = tag_fun('tr');
var td = tag_fun('td');


function tab_manager(){
    this._tabs = [];
}

tab_manager.prototype.load = function(callback){
    var self = this;
    callback = callback || _.noop;
    _.time("tabs");
    chrome.tabs.query({}, function(tabs){
        self._tabs = tabs;
        if(self.tabs().length){ _.log.debug("tabs(", tabs.length, ")[0]", tabs[0]); }
        _.time("tabs", true);
        callback();
    });
};

tab_manager.prototype.tabs = _.r("_tabs");


function tab_list_view(selector, tab_man){

    // this._tree = {};
    this._scroll_ahead = 300;
    this._page_down_lines = 10;
    this._page_up_lines = 10;
    this._selector = selector;
    this._cursor_position = 0;
    this._tab_manager = tab_man;
}

tab_list_view.prototype.selector = _.r("_selector");
tab_list_view.prototype.cursor_position = _.r("_cursor_position");
tab_list_view.prototype.tab_manager = _.r("_tab_manager");

tab_list_view.prototype.maintain_viewport = function(){
    var rect = $(".cursor")[0].getBoundingClientRect();
    var vertical_adjustment = (rect.bottom + this._scroll_ahead) - $(window).height();
    $("body").scrollTop($("body").scrollTop() + vertical_adjustment);
}

tab_list_view.prototype.handle_key_press = function(key){
    var self = this;

    _.log.debug("keypress: ", key.which);

    var valid_movement = false;

    if(key.which === 106 || key.which === 74){ // j or J
        self.cursor_down();
    }else if(key.which === 107 || key.which === 75){ // k or K
        self.cursor_up();
    }else if(key.which === 4 || key.which === 74){ // ctrl + d
        self.cursor_page_down();
    }else if(key.which === 21 && key.ctrlKey){ // ctrl + u
        self.cursor_page_up();
    }

};

tab_list_view.prototype.cursor_down = function(){
    this.move_cursor(this.cursor_position() + 1);
};

tab_list_view.prototype.cursor_up = function(){
    this.move_cursor(this.cursor_position() - 1);
};

tab_list_view.prototype.cursor_page_down = function(){
    this.move_cursor(this.cursor_position() + this._page_down_lines);
};

tab_list_view.prototype.cursor_page_up = function(){
    this.move_cursor(this.cursor_position() - this._page_up_lines);
};


tab_list_view.prototype.move_cursor = function(i){
    var self = this;

    if(i < 0){ i = 0; }
    else if(i >= $(self.selector() + " .tab_list tr").length){
        i = $(self.selector() + " .tab_list tr").length-1;
    }

    $(self.selector() + " .tab_list tr").removeClass("cursor");
    $($(self.selector() + " .tab_list tr")[i]).addClass("cursor");
    self._cursor_position = i;
    self.maintain_viewport();

    return(true);
};

tab_list_view.prototype.bind_key_handlers = function(){
    var self = this;
    $(this.selector()).keypress(function(e){
        self.handle_key_press(e);
    });
};

// _.log.level('debug');

tab_list_view.prototype.add_tab_to_table = function(tab){
    var self = this;

    var html = tr(
        td(tab.title),
        td(tab.url)
    );

    var elem = $(html);

    $(elem).data({
        window_id: tab.windowId,
        tab_id: tab.id
    });
      
    _.log.debug("elem.data.tab_id: ", $(elem).data("tab_id"));
    // _.log.debug($(elem).data("window_id"));

    elem.click(function(e){
        var tr = $(e.target).parents("tr");
        var window_id = $(tr).data("window_id");
        var tab_id = $(tr).data("tab_id");
        // _.log.debug("click: ", "window_id: ", window_id, " tab_id: ", tab_id);
        // focus_tab(window_id, tab_id);
    });

    $(self.selector() + " .tab_list").append(elem);
}

tab_list_view.prototype.render = function(){
    var self = this;
    _.each(self.tab_manager().tabs(), function(tab){ self.add_tab_to_table(tab); });
    $(".tab_list tr").first().addClass("cursor");
};

$(function(){
    var manager = new tab_manager();
    manager.load(function(){
        var view = new tab_list_view("body", manager);
        view.render();
        view.bind_key_handlers();
    });
});




