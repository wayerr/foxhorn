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

let opts = new Opts();

function listen(id, event, func) {
    var el = typeof id === "string"? document.getElementById(id) : id;
    el.addEventListener(event, func);
}

const DEF_USER_PLAYER_CODE =
`//see doc on https://github.com/wayerr/foxhorn
foxhorn.setPlayer({
        features: new Set([foxhorn.F_PROGRESS_EVENT])
        open: () => api.on("update", foxhorn.playerProgress),
        close: () => api.off(foxhorn.playerProgress),
        play: () => api.isPlaying()? api.pause() : api.play(),
        next: api.next,
        prev: api.prev,
        getProgress: api.getProgress,
        isPlaying: api.isPlaying,
        hasMedia: () => !!api.getTrack(),
        getTrack: () => {
            let ct = api.getTrack();
            return {
                id:"track",
                title: ct.title,
                position: ct.duration * api.getProgress(),
                duration: ct.duration
            };
        }
    });`;

class UserPlayers {

    constructor() {
        this.elSelect = document.getElementById("user-players");
        this.elPlayerName = document.getElementById("user-player-name");
        this.elPlayerCode = document.getElementById("user-player-code");
        listen("user-player-add", "click", () => {
            this._add("myplayer", DEF_USER_PLAYER_CODE);
        });
        listen("user-player-remove", "click", () => {
            let index = this.elSelect.selectedIndex;
            if(index === -1) {
                return;
            }
            this.elSelect.remove(index);
            this.clearPlayer();
            if(this.elSelect.length <= index) {
                index = this.elSelect.length - 1;
            }
            if(index >= 0) {
                //save selection 
                this.elSelect.selectedIndex = index;
            }
        });
        // load from selected
        listen(this.elSelect, "change", (e) => {
            let index = this.elSelect.selectedIndex;
            if(index === -1) {
                this.clearPlayer();
                return;
            }
            let opt = this.elSelect.item(index);
            this.elPlayerName.value = opt.text;
            this.elPlayerCode.value = this._getCode(opt);
        });
        // save to selected
        listen(this.elPlayerName, "change", (e) => {
            let index = this.elSelect.selectedIndex;
            if(index === -1) {
                return;
            }
            let opt = this.elSelect.item(index);
            opt.text = this.elPlayerName.value;
        });
        listen(this.elPlayerCode, "change", (e) => {
            let index = this.elSelect.selectedIndex;
            if(index === -1) {
                return;
            }
            let opt = this.elSelect.item(index);
            this._setCode(opt, this.elPlayerCode.value);
        });
    }

    _add(name, code) {
        let o = document.createElement("option");
        o.text = name;
        this._setCode(o, code);
        this.elSelect.add(o);
    }

    _setCode(opt, val) {
        opt.setAttribute("data-code", val);
    }

    _getCode(opt) {
        return opt.getAttribute("data-code");
    }

    clearPlayer() {
        this.elPlayerName.value = null;
        this.elPlayerCode.value = null;
    }
    
    getData() {
        let res = {};
        for(var i = 0; i < this.elSelect.length; ++i) {
            let opt = this.elSelect.item(i);
            res[opt.text] = this._getCode(opt);
        }
        return res;
    }

    setData(val) {
        while(this.elSelect.length > 0) {
            this.elSelect.remove(this.elSelect.length - 1);
        }
        //val = {"name": "code"};
        for(let name in val) {
            let code = val[name];
            this._add(name, code);
        }
    }
}

let userPlayers = new UserPlayers();


function saveOptions(e) {
    e.preventDefault();
    let data = {};
    opts.forEach((key, desc) => {
        let el = document.getElementById(desc.elem);
        var res;
        if(el.nodeName === "INPUT" && el.type === "checkbox") {
            res = el.checked;
        } else if(el === userPlayers.elSelect) {
            res = userPlayers.getData();
        } else {
            res = el.value;
        }
        data[key] = res;
    });
    opts.save(data);
}

function restoreOptions() {

    var loader = opts.load();
    loader.then((data) => {
        opts.forEach((key, desc) => {
            let el = document.getElementById(desc.elem);
            let val = data[key];
            if(el.nodeName === "INPUT" && el.type === "checkbox") {
                el.checked = val;
            } else if(el === userPlayers.elSelect) {
                userPlayers.setData(val);
            } else {
                el.value = val;
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);

listen("opts-save", "click", saveOptions);
listen("opts-clear", "click", () => {
     compat.p(browser.storage.local.clear).catch(e => {console.error("Can not clear options:", e);});
});
