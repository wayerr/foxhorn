// we need to store load this from json file 
var actionsSrc = "{\"title\":\"&#9646;&#9654;\", \"id\":\"togglePause\"}";
var rulesSrc = /*"{\"action\":\"togglePause\", \"url\":\"music.yandex.ru\", \"code\":\"sendKey:0x20\"}\n"+*/
               "{\"action\":\"togglePause\", \"code\":\"toggleMedia\"}";

class Code {
    constructor() {
        this.protos = {
            sendKey: this._emulateKeyPress.bind(this),
            toggleMedia: this._toggleMedia.bind(this),
        };
    }
    
    parse(src) {
        let protoEnd = src.indexOf(':');
        let proto;
        let arg;
        if(protoEnd == -1) {
            proto = src;
            arg = null;
        } else {
            proto = src.substring(0, protoEnd);
            arg = src.substring(protoEnd + 1);
        }
        let handler = this.protos[proto];
        if(!handler) {
            console.error(`No code protocol handler for '${src}'`);
            return () => {};
        }
        return (ctx) => {handler(ctx, arg)};
    }
    
    _execInTab(ctx, code) {
        browser.tabs.executeScript(ctx.tab.id, {code:code}).then(null, (a) => console.error(a));
    }
    
    _emulateKeyPress(ctx, key) {
        if(ctx.tab.id == browser.tabs.TAB_ID_NONE) {
            return;
        }
        key = Number(key)
        let code = `
            function createEvent(type) {
                let e = document.createEvent("KeyboardEvent");
                let initMethod = typeof e.initKeyboardEvent !== 'undefined' ? "initKeyboardEvent" : "initKeyEvent";
                e[initMethod](type, true, true, window, false, false, false, false, ${key}, ${key});
                return e;
            }
            document.dispatchEvent(createEvent("keydown"));
            document.dispatchEvent(createEvent("keypress"));
            document.dispatchEvent(createEvent("keyup"));`;
        console.debug(`sendKey '${key}' to tab '${ctx.tab.id}' with '${ctx.tab.url}' `)
        this._execInTab(ctx, code);
    }

    _toggleMedia(ctx) {
        console.debug(`toggle media in tab '${ctx.tab.id}' with '${ctx.tab.url}' `)
        //it may glitch when page has more then one paused or played items
        var code = `
            (function() {
                var items = [];
                let forEachTag = (tag, handler) => Array.prototype.forEach.call(document.getElementsByTagName(tag), handler);
                forEachTag("audio", (a) => items.push(a));
                forEachTag("video", (a) => items.push(a));
                if(items.length != 1) {
                    return;
                }
                items.forEach(item => {
                    if(item.paused) {
                        item.play();
                    } else if(item.played) {
                        item.pause()
                    }
                });
            })()`;
        this._execInTab(ctx, code);
    }
}

class FoxHorn {

    constructor() {
        this.code = new Code();
        this.actions = this.loadActions();
    }
    
    _constructRule(rule) {
        let filter = (ctx) => {
            if(!rule.url) {
                return true;
            }
            return ctx.tab.url.indexOf(rule.url) >= 0;
        };
        rule.filter = filter;
        rule.exec = this.code.parse(rule.code);
    }
    
    loadActions() {
        let map = {};
        actionsSrc.split('\n').forEach(line => {
            let action = JSON.parse(line);
            action.rules = [];
            map[action.id] = action;
        });
        rulesSrc.split('\n').forEach(line => {
            let rule = JSON.parse(line);
            let action = map[rule.action];
            if(!action) {
                console.error(`No action for id '${rule.action}' from rule '${line}'`);
                return;
            }
            this._constructRule(rule);
            action.rules.push(rule);
            return action;
        });
        console.debug(JSON.stringify(map));
        return map;
    }
    
    listActions() {
        let actionList = document.getElementById('actions-list');
        let fragment = document.createDocumentFragment();
        actionList.textContent = '';
        for(let id in this.actions) {
            let action = this.actions[id];
            let link = document.createElement('a');
            link.innerHTML = action.title;
            link.setAttribute('href', "#");
            link.setAttribute('data-action', action.id);
            link.classList.add('switch-tabs');
            fragment.appendChild(link);
        }
        actionList.appendChild(fragment);
    }
    
    loaded() {
        console.debug("loaded");
        this.listActions();
    }
    
    getCurrentWindowTabs() {
        return browser.tabs.query({currentWindow: true});
    }
    
    callOnTabs(callback) {
        this.getCurrentWindowTabs().then((tabs) => {
            callback(tabs);
        }); 
    }
    
    click(e) {
        let id = e.target.getAttribute('data-action');
        let action = id? this.actions[id] : null;
        if(action) {
            this.callOnTabs((tabs) => {
                console.debug(`Call '${action.id}' action`)
                var ctx = {
                    tabs:tabs
                };
                action.rules.forEach(r => {
                    ctx.tabs.forEach(tab => {
                        ctx.tab = tab;
                        if(r.filter(ctx)) {
                            r.exec(ctx);
                        }
                    });
                });
            });
        }
        e.preventDefault();
    }
}

var fh = new FoxHorn();

document.addEventListener("DOMContentLoaded", () => fh.loaded());
document.addEventListener("click", (e) => fh.click(e));
