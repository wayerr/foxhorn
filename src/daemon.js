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
        this.player = null;
        this.setCurrentPlayer(null);
        this.cmdHandlers = {
            "cmd-play": this.invokePlayer("player-play"),
            "cmd-prev": this.invokePlayer("player-prev"),
            "cmd-next": this.invokePlayer("player-next")
        };
        this.rpc = new Rpc({
            methods:{
                "player-get": this.resolvePlayer,
                "opts-save": this.loadOpts.bind(this)
            },
            handlers: {
                "player-play": this.invokePlayer("player-play"),
                "player-prev": this.invokePlayer("player-prev"),
                "player-next": this.invokePlayer("player-next"),
                "player-get-state": this.invokePlayer("player-get-state"),
                "on-player-update": this.onPlayerUpdated.bind(this)
            }
        });
        this.opts = new Opts();
        this.closeables = [this.rpc.close];
        this.sites = [];
        this.loadOpts();
    }

    init() {
        this.logging && console.debug("Init Daemon part of FoxHorn.");
        let listen = (src, func) => {
            let binded = func.bind(this);
            src.addListener(binded);
            this.closeables.push(() => {
                src.removeListener(binded);
            });
        };

        listen(browser.commands.onCommand, this.onCommand);
        listen(browser.webNavigation.onCompleted, this.onPageLoaded);
        listen(browser.tabs.onRemoved, this.onPageRemoved);
        // browser.tabs.onUpdated cause recursion at scrip iclude, so we not use this
        this._on_breforeunload = this.onUnload.bind(this);
        window.addEventListener("beforeunload", this._on_breforeunload);
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
        console.debug("Begin unload daemon");
        window.removeEventListener("beforeunload", this._on_breforeunload);
        for(let closeable of this.closeables) {
            try {
                closeable();
            } catch (e) {
                console.error("Can not invoke closeable due to error: ", e);
            }
        }
        this.rpc.call(M_SYSTEM_UNLOAD)();
        this.invokePlayer(M_SYSTEM_UNLOAD)({
            args: [],
            sender: null,
            sendResponse: () => {}
        });
        console.debug("End unload daemon");
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
        let p = compat.p(browser.tabs.sendMessage, tabId, msg);
        this.logging && p.catch((e) => console.error(`On send '${method}' to content we got error: ${e}`));
        return p;
    }

    invokePlayer(method) {
        return (arg) => {
            let player = this.player;
            if(!player.tabId) {
                this.logging && console.debug("no tab in player:", player);
                return;
            }
            this.logging && console.debug(`Invoke ${player}.${method}()`);
            this.sendToTab(player.tabId, method, arg.args)
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

    onPageLoaded(e) {
        if(e.frameId !== 0) {
            return;
        }
        this.logging && console.debug("Page loading:", e);
        this.checkForPlayer(e);
    }

    onPageRemoved(tabId, removeInfo) {
        this.logging && console.debug("Page removed:", tabId);
        this.setCurrentPlayer(null);
        this.findPlayer();
    }

    checkForPlayer(e) {
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
        if(this.player && arg &&
            this.player.tabId === arg.tabId &&
            this.player.url === arg.url) {
            return;
        }
        this.logging && console.debug("Change current player to: ", arg);
        if(!arg) {
            this.player = {
                tabId: null
            };
        } else {
            this.player = {
                tabId: arg.tabId,
                url: arg.url,
                toString: function() {
                    return `('${this.url}' in ${this.tabId} tab)`;
                }
            };
        }
    }

    onPlayerUpdated(arg) {
        let state = arg.args[0];
        let tab = arg.sender && arg.sender.tab;
        if(!tab) {
            return;
        }
        let playerTab = {
            tabId: tab.id,
            url: tab.url
        };
        this.setCurrentPlayer(playerTab);
    }

    injectPlayer(arg) {
        this.logging && console.debug(`Inject player driver '${arg.player}' to tab '${arg.tabId}' url '${arg.url}'`);
        this.setCurrentPlayer(arg);

        //test that tab has not script
        this.sendToTab(arg.tabId, "content-get-state", [])
            .catch(() => {
            //we inject player when content can not response
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
        });
    }
}

//common.test();
let daemon = new Daemon();

daemon.init();