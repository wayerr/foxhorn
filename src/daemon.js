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

class Daemon {
    constructor() {
        this.player = {
            tabId: null
        };
        this.cmdHandlers = {
            "cmd-play": this.invokePlayer("player-play"),
            "cmd-prev": this.invokePlayer("player-prev"),
            "cmd-next": this.invokePlayer("player-next")
        };
        this.rpc = new Rpc({
            methods:{
                "player-get": this.resolvePlayer,
                "opts-save": this.loadOpts.bind(this),
                "on-player-update": this.onPlayerUpdated.bind(this)
            },
            handlers: {
                "player-play": this.invokePlayer("player-play"),
                "player-prev": this.invokePlayer("player-prev"),
                "player-next": this.invokePlayer("player-next"),
                "player-get-state": this.invokePlayer("player-get-state")
            }
        });
        this.opts = new Opts();
        this.sites = [];
        this.loadOpts();
    }

    init() {
        this.logging && console.debug("Init Daemon part of FoxHorn.");
        let listen = (src, func) => {
            src.addListener(func.bind(this));
        };

        listen(browser.commands.onCommand, this.onCommand);
        listen(browser.webNavigation.onCompleted, this.onPageChanged);
        
        window.addEventListener("unload", this.onUnload);
    }

    loadOpts() {
        this.sites = [];
        this.opts.load().then(this.onOptsLoaded.bind(this));
    }

    onOptsLoaded(data) {
        this.logging = !!data.logging;
        for(let line of data.sites.split('\n')) {
            if(line.startsWith("#")) {
                continue;
            }
            let arr = line.split(/\s+/);
            if(arr.length < 2) {
                console.error("Invalid site line:", line);
                continue;
            }
            let expr = arr[0];
            let colonPos = expr.indexOf(':');
            if(colonPos < 1 || colonPos > expr.length - 2) {
                console.error("Invalid pattern in site line:", line);
                continue;
            }
            let exprProto = expr.substring(0, colonPos);
            let exprData = expr.substring(colonPos + 1);
            let player = arr[1];
            var matcher = null;
            if(exprProto === "domain") {
                matcher = (data) => {
                    if(exprData === data.domain) {
                        return player;
                    }
                };
            } else {
                console.error("Invalid protocol '", exprProto, "' in site line:", line);
                continue;
            }
            this.sites.push({
                expr: expr,
                player: player,
                matcher: matcher
            });
        }
        this.findPlayer();
    }

    onUnload() {
        this.logging && console.debug("Begin unload");
        window.removeEventListener("unload", this.onUnload);
        this.rpc.call("system-unload")();
    }

    findPlayer() {
        compat.p(browser.tabs.query, {})
                .then((tabs) => {
            for(let tab of tabs) {
                let player = this.resolvePlayer({url: tab.url});
                if(!player) {
                    continue;
                }
                this.injectPlayer({
                    tabId: tab.id,
                    player: player.name,
                    url: tab.url
                });
            }
        });
    }

    onCommand(cmd) {
        this.logging && console.debug("cmd in daemon:", cmd);
        let handler = this.cmdHandlers[cmd];
        if(handler) {
            let arg = {arg: {}, sender: null, sendResponse: () => {}};
            handler(arg);
        }
    }

    sendToTab(tabId, method, args) {
        let msg = {
            method: method,
            args: args
        };
        return compat.p(browser.tabs.sendMessage, tabId, msg)
           .catch((e) => console.error(`On send '${method}' to content we got error: ${e}`));
    }

    invokePlayer(method) {
        return (arg) => {
            let player = this.player;
            if(!player.tabId) {
                this.logging && console.debug("no tab in player:", player);
                return;
            }
            this.logging && console.debug(`Invoke ${player}.${method}()`);
            this.sendToTab(player.tabId, method, [arg.arg])
                    .then(arg.sendResponse);
        };
    }

    resolvePlayer(arg) {
        let url = arg.url;
        let rr = /https?:\/\/([^:/]+)/.exec(url);
        if(!rr) {
            // it happen when url looks like 'about:config'
            return;
        }
        let domain = rr[1];
        let data = {
            url: url,
            domain: domain
        };
        var player = null;
        for(let site of this.sites) {
            player = site.matcher(data);
            if(player) {
                break;
            }
        }
        if(player) {
            this.logging && console.debug("Found player:", player, " for ", data);
            return {name:player};
        }
        return null;
    }

    onPageChanged(e) {
        if(e.frameId !== 0) {
            return;
        }
        this.logging && console.debug("PAGE CHANGED:", e);
        let playerSrc = this.resolvePlayer({url: e.url});
        let isPlayerTab = this.player.tabId === e.tabId;
        if(!playerSrc) {
            if(isPlayerTab) {
                // clean player
                this.player = {};
            }
            return;
        }
        this.injectPlayer({
            tabId: e.tabId,
            player: playerSrc.name,
            url: e.url
        });
    }
    
    setCurrentPlayer(arg) {
        this.player = {
            tabId: arg.tabId,
            name: arg.player,
            url: arg.url,
            toString: function() {
                return `${this.name}('${this.url}' in ${this.tabId} tab)`;
            }
        };
    }

    onPlayerUpdated(state) {
        if(!state.tabId) {
            return;
        }
        this.setCurrentPlayer({
            tabId: state.tabId,
            url: state.url,
            name: ""
        });
    }

    injectPlayer(arg) {
        this.logging && console.debug(`Inject player driver '${arg.player}' to tab '${arg.tabId}' url '${arg.url}'`);
        this.setCurrentPlayer(arg);

        let executor = (arr, cb) => {
            let src = arr.shift();
            this.logging && console.debug("Execute ", src, " in ", arg.tabId);
            let promise = compat.p(browser.tabs.executeScript, arg.tabId, {file: src, runAt:"document_start"});
            promise.catch((e) => console.error('On exec ', src, ' we got error:', e));
            if(arr.length > 0) {
                promise.then(() => executor(arr, cb));
            } else {
                promise.then(cb);
            }
        };
        executor(["src/common.js", "src/content.js"], () => {
            this.logging && console.debug(`Send install command to ${arg.tabId}.`);
            this.sendToTab(arg.tabId, "content-init", [{
                    player: arg.player,
                    logging: this.logging
                }]);
        });
    }
}

//common.test();
let daemon = new Daemon();

daemon.init();