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

document.addEventListener("click", (e) => {
    let id = e.target.id;
    if(id) {
        if("open-options" === id) {
            compat.p(browser.runtime.openOptionsPage);
        } else {
            compat.p(browser.runtime.sendMessage, {method:id}).then(null, (e) => console.error(`On '${id}' got error: ${e}`));
        }
    }
    e.preventDefault();
});

class Popup {
    constructor() {

    }

    init() {
        this.rpc = new Rpc({
            methods:{
                "on-player-update": this.onPlayerUpdate
            }
        });
        this.rpc.call("player-get-state")();
    }

    onPlayerUpdate(data) {
        function pf(num) {
            let s = num.toString();
            if(s.length < 2) {
                return "0" + s;
            }
            return s;
        }
        function format(time) {
            if(typeof time !== "number") {
                return time;
            }
            let s = time % 60;
            let mh = (time - s) / 60;
            let m = mh % 60;
            let h = (mh - m) / 60;
            return (h? h + ":" : "") + pf(m) + ":" + pf(Math.round(s));
        }
        console.debug("Player updated with: ", data);
        let track = data.tracks[0];
        let ti = document.getElementById("track-title");
        ti.innerText = track.title;
        let td = document.getElementById("track-duration");
        td.innerText = format(track.position) + '/' + format(track.duration);
    }
}

let popup = new Popup();
popup.init();