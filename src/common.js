/*
 * Copyright (C) 2017 wayerr
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

//workaround for chrome
var _z = this;
let compat = new (function(){
    var isChrome = !!_z["chrome"];
    if(!_z["browser"] && isChrome) {
        browser = chrome;
    }
    this.p = function(/*func, ...args*/) {
        let args = Array.from(arguments);
        let func = args.shift();
        if(!isChrome) {
            return func.apply(null, args);
        }
        let handlers = {};
        let p = new Promise((resolve, reject) => {
            handlers.resolve = resolve;
            handlers.reject = resolve;
        });
        let cb = function() {
            let err = chrome.runtime.lastError;
            if(err) {
                handlers.reject(err);
                return;
            }
            let cbargs = Array.from(arguments);
            //console.debug("CBARGS:", JSON.stringify(cbargs));
            handlers.resolve.apply(null, cbargs);
        };
        args.push(cb);
        func.apply(null, args);
        return p;
    };
})();

delete this._z;

let utils = {
    currentScript: () => {
        var text = null;
        try {
            text = document.currentScript.src;
            text = /\/\/[a-fA-F0-9-]+\/(.+)/.exec(text)[1];
        } catch (e) {
            //console.error(e);
        }
        if(!text && window.location) {
            text = window.location.href;
        }
        return text || "<unknown>";
    }
};

class Rpc {
    constructor(arg) {
        this._where = utils.currentScript();
        console.debug("Load rpc in ", this._where);
        this.handlers = {};
        this.debug = false;
        
        if(arg) {
            if(arg.handlers) {
                for(let name in arg.handlers) {
                    let func = arg.handlers[name];
                    this.handlers[name] = func;
                }
            }

            if(arg.methods) {
                for(let name in arg.methods) {
                    let func = arg.methods[name];
                    this.addMethod(name, func);
                }
            }

            if(arg.debug) {
                this.debug = true;
            }
        }
        browser.runtime.onMessage.addListener(this.onMessage.bind(this));
    }

    onMessage(msg, sender, sendResponse) {
        this.debug && console.debug(this._where, " msg in:", msg);
        let method = msg.method;
        if(!method) {
            console.error(this._where, `Unexpected message '${msg}' without 'method' field`);
            return;
        }
        let handler = this.handlers[method];
        if(!handler) {
            this.debug && console.warn(this._where, ` Can not find handler for method '${method}' of message:`, msg);
            return;
        }
        let arg = {
            args: msg.args || [],
            sender: sender,
            sendResponse: (e) => sendResponse(e) // it prevent warning
        };
        handler(arg);
    }

    dispatcher(method) {
        return (arg) => {
            this.debug && console.debug(this._where, " Call of ", method, " with ", arg);
            try {
                let res = method.apply(this, arg.args);
                this.debug && console.debug(this._where, "Call of ", method, " got ", res);
                arg.sendResponse(res);
            } catch(e) {
                console.error(this._where, "Fail to call " , method, " due to error:", e);
            }
        };
    }

    addMethod(name, func) {
        var handler = this.handlers[name];
        if(handler) {
            console.error(this._where, `Can not redefine method '${name}' with ${func} because it already registered with ${handler}`);
            return;
        }
        handler = this.dispatcher(func);
        this.debug && console.debug(this._where, `Define method '${name}'`);
        this.handlers[name] = handler;
    }

    call(name) {
        let func = function() {
            let msg = {
                method:name,
                args: Array.from(arguments)
            };
            this.debug && console.debug(this._where, "Send message", msg);
            let promise = compat.p(browser.runtime.sendMessage, msg);
            promise.catch((e) => {
               console.error(this._where, "Error response from ", name, " : ", e);
            });
            return promise;
        };
        return func.bind(this);
    }
}