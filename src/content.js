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

/*
 * iface of player
class Player {
    play() {}
    next() {}
    prev() {}
    getState() {
        return {
            paused:false,
            // max tracks - 10
            // each track: {id:obj, title:"text", duration: 213454 /seconds/}
            //
            // list of tracks is not required
            tracks: [
                {track},
                {track}
            ]
        };
    }
}*/

let players = {};

class Content {
    constructor() {
        this._player = null;
        this.rpc = new Rpc({
            methods: {
                "player-play": this.invokePlayer("play"),
                "player-prev": this.invokePlayer("prev"),
                "player-next": this.invokePlayer("next"),
                "player-get-state": this.playerUpdated.bind(this)
            }
        });
    }

    getPlayer() {
        return this._player;
    }

    init() {
    }

    initPlayer(player) {
        console.debug("Use player type :", player);
        if(player) {
            this._player = player.factory();
            console.debug("Make player: ", this._player);
        }
    }

    invokePlayer(name) {
        return () => {
            let player = this.getPlayer();
            var res = null;
            if(player) {
                let func = player[name];
                if(func) {
                    res = func.apply(player);
                } else {
                    console.error(`No '${name}' in player: ${player}`);
                }
            } else {
                console.warn('No initialised player');
            }
            return res;
        };
    }

    getPlayerState() {
        if(!this._player) {
            return null;
        }
        return this._player.getState();
    }

    playerUpdated() {
        let state = this.getPlayerState();
        this.rpc.call("on-player-update")(state);
    }
}

console.debug('Begin content init');
content = new Content();

content.init();
console.debug('Content inited');