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
 Common script. Used with any player implementation.
 Provide message driver connection with 'content' script for player api.

 //iface of player
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
    close() {} //used for clear player resource before unload
}
 */

console.debug("Inject foxhorn.");
let foxhorn = new (function(){
    var player = null;
    function send(to, args) {
        window.postMessage({
              foxhorn:true,
              method: to,
              args: args
        }, "*");
    }
    this.playerUpdated = function() {
        let s = player && player.getState() || null;
        send("on-player-update", [s]);
    }.bind(this);
    this.setPlayer = function(p) {
        if(player === p) {
            return;
        }
        player = p;
        this.playerUpdated();
    }.bind(this);
    window.addEventListener("message", function(event) {
      if (event.source !== window || !player) {
        return;
      }
      let msg = event.data;
      if (!msg.foxhorn) {
          return;
      }
      console.log("Player receive: " + msg);
      let method = msg.method;
      let response = msg.response;
      let func = player[method];
      if(!func) {
          return;
      }

      let res = func.apply(player, msg.args);
      if(response) {
          send(response, [res]);
      }
    }.bind(this), false);
})();