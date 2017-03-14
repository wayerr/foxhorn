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

const ID_PLAYER_COMMON = "foxhorn_player_common";
const ID_PLAYER = "foxhorn_player_agent";
const EV_PLAYER_UPDATE = "on-player-update";

class Content {
    constructor() {
        this._player = null;
        this.unloadCallbacks = [];
        this.rpc = new Rpc({
            methods: {
                "player-play": this.invokePlayer("play"),
                "player-prev": this.invokePlayer("prev"),
                "player-next": this.invokePlayer("next"),
                "player-get-state": this.invokePlayer("getTrack", EV_PLAYER_UPDATE),
                "content-init": this.contentInit.bind(this),
                "system-unload": this.close.bind(this)
            }
        });

        this.onDomMessage = function(event) {
            if (event.source !== window) {
                return;
            }
            let msg = event.data;
            if (!msg.foxhorn || msg.fromContent) {
                return;
            }
            //console.debug("Content receive: ", msg);
            let method = msg.method;
            //let response = msg.response;
            if(method === EV_PLAYER_UPDATE) {
                this.playerUpdated.apply(this, msg.args);
            }
        }.bind(this);
        window.addEventListener("message", this.onDomMessage);
    }

    invokePlayer(name, to) {
        return () => {
            let args = Array.from(arguments);
            args.shift();
            let msg = {
                foxhorn:true,
                fromContent: true,
                method: name,
                args: args
            };
            if(to) {
                msg.response = to;
            }
            window.postMessage(msg, "*");
        };
    }

    contentInit(arg) {
        this.logging = arg.logging;
        this.logging && console.debug(`Begin install player ${arg.player}.`);
        function addScript(id, script, callback) {
            try {
                let scr = document.createElement("script");
                scr.id = id;
                let source = browser.runtime.getURL(script);
                scr.src = source;
                scr.setAttribute("type", "text/javascript");
                if(callback) {
                    callback(scr);
                }
                document.head.appendChild(scr);
            } catch (e) {
                console.error(`Can not install ${id} from: ${script}, due to error:`, e);
            }
        }
        addScript(ID_PLAYER_COMMON, `src/player/_common.js`, (scr) => {
            scr.setAttribute("data-init", JSON.stringify({
                logging: this.logging
            }));
        });
        addScript(ID_PLAYER, `src/player/${arg.player}.js`);
    }

    playerUpdated(state) {
        let tab = this.rpc.tab;
        if(tab) {
            state.tabId = tab.id;
            state.url = tab.url;
        }
        this.rpc.call("on-player-update")(state);
    }

    close() {
        window.removeEventListener("message", this.onDomMessage);
        function clearNode(id) {
            let scr = document.getElementById(id);
            if(scr) {
                scr.parentNode.removeChild(scr);
            }
        }
        clearNode(ID_PLAYER_COMMON);
        clearNode(ID_PLAYER);
    }
}

console.debug('Begin content init');
let content = new Content();
console.debug('Content inited');