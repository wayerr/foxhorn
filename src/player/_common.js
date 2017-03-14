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
    // player has played or paused media, when false - all non lifecycle methods will never been called
    hasMedia() {}
    isPlaying() {} 
    getProgress() {} // value 0 - 1, which is meaning part of played time
    getTrack() {
        return {
            id:obj,
            title:"text",
            position: 23144, /seconds/
            duration: 213454 /seconds/
        };
    }
//lifecycle methods
    open() {}
    close() {} //used for clear player resource before unload
}
 */

console.debug("Inject foxhorn.");
// it must be redeclarable for reloading script
if(foxhorn) {
    try {
        foxhorn.close();
    } catch (e) {
        console.error("On close redeclarated 'foxhorn':", e);
    }
}
var foxhorn = new (function(){
    let dataInit = {};
    try {
        let dataInitText = document.currentScript.getAttribute("data-init");
        dataInit =  dataInitText && JSON.parse(dataInitText);
    } catch(e) {
        console.error("Can not parse data-init attribute of currrent script:", e);
    }
    var player = null;
    function send(to, args) {
        window.postMessage({
              foxhorn:true,
              method: to,
              args: args
        }, "*");
    }
    function safeCall(func, thiz) {
        try {
            let args = Array.from(arguments).slice(2);
            return func.apply(thiz, args);
        } catch (e) {
            console.error("Call of ", thiz, ".", func, " return error: ", e);
        }
    }
    let intervalId = window.setInterval(function() {
        try {
            if(!player.hasMedia() || !player.isPlaying()) {
                return;
            }
        } catch (e) {
            // logging here will produce too may noize
            return;
        }
        this.playerUpdated();
    }.bind(this),1000);
    this.playerUpdated = function() {
        let s = {};
        if(player.hasMedia()) {
            s = player.getTrack() || s;
            s.paused = !player.isPlaying();
        }
        send("on-player-update", [s]);
    }.bind(this);
    this.setPlayer = function(p) {
        if(player === p) {
            return;
        }
        player = p;
        this.playerUpdated();
    }.bind(this);
    let windowListener = function(event) {
      if (event.source !== window || !player) {
        return;
      }
      let msg = event.data;
      if (!msg.foxhorn || !msg.fromContent) {
          return;
      }
      //console.debug("Player receive: ", msg);
      let method = msg.method;
      let response = msg.response;
      let func = player[method];
      if(!func) {
          console.warn("Can not find handler for: ", method, " in ", Object.keys(player));
          return;
      }
      if(!player.hasMedia()) {
          if(response) {
              send(response, [null]);
          }
      } else {
          try {
              let res = func.apply(player, msg.args);
              if(response) {
                  send(response, [res]);
              }
          } catch (e) {
              console.error("Can not invoke player method: ", method, "(", msg.args, "), due to error:", e);
          }
      }
    }.bind(this);
    window.addEventListener("message", windowListener);

    let beforeUnloadListener = function(event) {
        dataInit.logging && console.debug("FH: befeoreunload");
        safeCall(player.close, player);
    }.bind(this);
    window.addEventListener("beforeunload", beforeUnloadListener);

    let loadListener = function(event) {
        dataInit.logging && console.debug("FH: load");
        safeCall(player.open, player);
    }.bind(this);
    window.addEventListener("load", loadListener);

    this.close = () => {
        if(intervalId !== null) {
            window.clearInterval(intervalId);
        }
        window.removeEventListener("message", windowListener);
        window.removeEventListener("beforeunload", beforeUnloadListener);
        window.removeEventListener("load", loadListener);
        safeCall(player.close, player);
    };
})();