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
    this._filtered_tabs = [];
    this._filter = "";
}

tab_manager.prototype.load = function(callback){
    var self = this;
    callback = callback || _.noop;
    _.time("tabs");
    chrome.tabs.query({}, function(tabs){
        self._tabs = tabs;
        _.time("tabs", true);
        callback();
    });
};

tab_manager.prototype.tabs = function(){
    if(this._filter){
        return(this._filtered_tabs);
    }else{
        return(this._tabs);
    }
};

tab_manager.prototype.filter = function(text){
    _.log.debug("tab_manager.filter: '", text, "'");

    this._filter = text;

    if(!text){ return; }

    this._filtered_tabs = _.filter(this._tabs, function(t){
        return(t.title.match(_.regex(text, "i")));
    });

    _.log.debug("tabs: ", this.tabs().length);
};

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

tab_list_view.prototype.handle_global_key_press = function(key){
    var self = this;

    _.log.debug("keypress: ", key.which);

    if(key.which === 106 || key.which === 74){ // j or J
        self.cursor_down();
    }else if(key.which === 107 || key.which === 75){ // k or K
        self.cursor_up();
    }else if(key.which === 4 || key.which === 74){ // ctrl + d
        self.cursor_page_down();
    }else if(key.which === 21 && key.ctrlKey){ // ctrl + u
        self.cursor_page_up();
    }else if(key.which === 13){ // enter
        self.focus_tab();
    }else if(key.which === 47){ // "/"
        _.nextTick(function(){
            self.focus_search();
        });
    }
};

tab_list_view.prototype.handle_search_key_press = function(key){
    var self = this;

    _.log.debug("search keypress: ", key.which);

    var text = $(self.selector() + " .search").val();

    self.filter_list(text);

    if(key.which === 13){ // enter
        self.focus_tab();
        self.clear_search();
    }
 
    // add support for ctrl + j, ctrl + k, etc when in the search box
    /*
    if(key.which === 106 || key.which === 74){ // j or J
        self.cursor_down();
    }else if(key.which === 107 || key.which === 75){ // k or K
        self.cursor_up();
    }else if(key.which === 4 || key.which === 74){ // ctrl + d
        self.cursor_page_down();
    }else if(key.which === 21 && key.ctrlKey){ // ctrl + u
        self.cursor_page_up();
   }else if(key.which === 47){ // "/"
        self.focus_search();
    }
    */
};

var timeout = null;
tab_list_view.prototype.filter_list = function(text){
    var self = this;
    if(timeout){ clearTimeout(timeout); }
    timeout = setTimeout(function(){
        self.tab_manager().filter(text);
        self.render();
    }, 150);
};

tab_list_view.prototype.clear_search = function(){
    $(".search").val("");
    this.filter_list("");
};

tab_list_view.prototype.focus_search = function(){
    $(".search").focus();
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

tab_list_view.prototype.focus_tab = function(){
    var row = $(".cursor")[0];
    var window_id = $(row).data("window_id");
    var tab_id = $(row).data("tab_id");
    _.log.debug("enter: ", "window_id: ", window_id, " tab_id: ", tab_id);
    tabs.focus_tab(window_id, tab_id);
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
        self.handle_global_key_press(e);
    });

    $(this.selector() + " .search").keypress(function(e){
        self.handle_search_key_press(e);
        e.stopPropagation();
    });

    // handle escape
    $(this.selector() + " .search").keyup(function(e){
        if(e.which === 27){ $(".search").blur(); }
        e.stopPropagation();
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
      
    elem.click(function(e){
        var tr = $(e.target).parents("tr");
        var window_id = $(tr).data("window_id");
        var tab_id = $(tr).data("tab_id");
        tabs.focus_tab(window_id, tab_id);
    });

    $(self.selector() + " .tab_list").append(elem);
}

tab_list_view.prototype.render = function(){
    var self = this;
    $(self.selector() + " .tab_list").empty();
    _.each(self.tab_manager().tabs(), function(tab){ self.add_tab_to_table(tab); });
    self.move_cursor(0);
};

$(function(){
    var manager = new tab_manager();
    manager.load(function(){
        var view = new tab_list_view("body", manager);
        view.render();
        view.bind_key_handlers();
    });
});




