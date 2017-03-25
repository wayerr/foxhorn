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
try {
    if(this["foxhorn"]) {
            console.warn("Detect already declarated 'foxhorn', try to close: ", foxhorn);
            foxhorn.close();
    }
} catch (e) {
    console.error("On close redeclarated 'foxhorn':", e);
}
foxhorn = new (function(){
    const ID_PLAYER = "foxhorn_player_agent";
    this.F_PROGRESS_EVENT = "f-progress-event";
    let dataInit = {};
    try {
        let dataInitText = document.currentScript.getAttribute("data-init");
        dataInit =  dataInitText && JSON.parse(dataInitText);
    } catch(e) {
        console.error("Can not parse data-init attribute of currrent script:", e);
    }
    let foxhornNode = document.currentScript; // it will be cahnged due script reload
    var player = null;
    var playerOpened = false;
    this.send = (to, args) => {
        window.postMessage({
              foxhorn:true,
              method: to,
              args: args || []
        }, "*");
    };
    function support(who, feature) {
        return who && who.features && who.features.has(feature);
    }
    function safeCall(func, thiz) {
        try {
            let args = Array.from(arguments).slice(2);
            return func.apply(thiz, args);
        } catch (e) {
            console.error("Call of ", thiz, ".", func, " return error: ", e);
        }
    }
    function playerClose() {
        dataInit.logging && console.debug("Close player");
        if(intervalId !== null) {
            window.clearInterval(intervalId);
        }
        if(player) {
            safeCall(player.close, player);
        }
        playerOpened = false;
    }
    function playerOpen() {
        if(playerOpened || !player) {
            return;
        }
        dataInit.logging && console.debug("Open player");
        if(player.open) {
            safeCall(player.open, player);
        }
        playerOpened =  true;
    }
    var intervalId = null;
    this.playerUpdated = function() {
        let s = {};
        if(player.hasMedia()) {
            s = player.getTrack() || s;
            s.paused = !player.isPlaying();
        }
        this.send("on-player-update", [s]);
    }.bind(this);
    var lastProgress = 0;
    this.playerProgress = function() {
        // in future we may send only progress value, but now it simply reduce
        // frequency of 'playerUpdated' events to one second
        let now = Date.now();
        if(now - lastProgress < 1000) {
            return;
        }
        // we suppose that player is sent other events (stop/pause & etc) correctly,
        // therefore we simply can skip progress for one second
        lastProgress = now;
        dataInit.logging && console.debug("Invoke 'updated' due to progress event.");
        this.playerUpdated();
    }.bind(this);
    this.installPlayer = function() {
        let scr = document.createElement("script");
        scr.id = ID_PLAYER;
        if(dataInit.playerCode) {
            scr.text = dataInit.playerCode;
        } else {
            scr.src = dataInit.playerUrl;
        }
        scr.setAttribute("type", "text/javascript");
        document.head.appendChild(scr);
    };
    this.setPlayer = function(p) {
        if(player === p) {
            return;
        }
        if(player) {
            playerClose();
        }
        player = p;
        playerOpened = false;
        dataInit.logging && console.debug("Player features: ", player.features);
        if(!support(player, this.F_PROGRESS_EVENT)) {
            // if player does not support events, we init interval
            dataInit.logging && console.debug("Create player watcher, due it not suppoer progress event.");
            intervalId = window.setInterval(function() {
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
        }
        if(document.readyState === "complete") {
            playerOpen();
        }
        this.playerUpdated();
    }.bind(this);
    this.getPlayer = function() {
        // it need only for debugging
        return player;
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
      if("close" === method) {
          console.debug("Close agent by event from context.");
          this.close();
          return;
      }
      let response = msg.response;
      let func = player[method];
      if(!func) {
          console.warn("Can not find handler for: ", method, " in ", Object.keys(player));
          return;
      }
      if(!player.hasMedia()) {
          if(response) {
              this.send(response, [null]);
          }
      } else {
          try {
              let res = func.apply(player, msg.args);
              if(response) {
                  this.send(response, [res]);
              }
          } catch (e) {
              console.error("Can not invoke player method: ", method, "(", msg.args, "), due to error:", e);
          }
      }
    }.bind(this);
    window.addEventListener("message", windowListener);

    let beforeUnloadListener = function(event) {
        dataInit.logging && console.debug("FH: befeoreunload");
        this.close();
    }.bind(this);
    window.addEventListener("beforeunload", beforeUnloadListener);

    let loadListener = function(event) {
        playerOpen();
    }.bind(this);
    window.addEventListener("load", loadListener);

    this.close = () => {
        window.removeEventListener("message", windowListener);
        window.removeEventListener("beforeunload", beforeUnloadListener);
        window.removeEventListener("load", loadListener);
        playerClose();
        let playerNode = document.getElementById(ID_PLAYER);
        if(playerNode) {
            playerNode.parentNode.removeChild(playerNode);
        }
        // remove node which init this
        if(foxhornNode && foxhornNode.parentNode) {
            foxhornNode.parentNode.removeChild(foxhornNode);
        }
    };
})();

foxhorn.installPlayer();