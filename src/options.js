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

function saveOptions(e) {
    e.preventDefault();
    let data = {};
    opts.forEach((key, desc) => {
        let el = document.getElementById(desc.elem);
        var res;
        if(el.nodeName === "INPUT" && el.type === "checkbox") {
            res = el.checked;
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
            } else {
                el.value = val;
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
function listen(elem, event, func) {
    document.getElementById(elem).addEventListener(event, func);
}
listen("opts-save", "click", saveOptions);
listen("opts-clear", "click", () => {
     compat.p(browser.storage.local.clear).catch(e => {console.error("Can not clear options:", e);});
});

let userPlayers = document.getElementById("user-players");
let userPlayerName = document.getElementById("user-player-name");
let userPlayerCode = document.getElementById("user-player-code");

listen("user-player-add", "click", () => {
    let o = document.createElement("option");
    o.text = "myplayer";
    userPlayers.add(o);
});
listen("user-player-remove", "click", () => {
    let index = userPlayers.selectedIndex;
    if(index === -1) {
        return;
    }
    userPlayers.remove(index);

});