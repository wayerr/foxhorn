/*
 * iface of player
class Player {
    play() {}
    pause() {}
    next() {}
    prev() {}
    getState() {
        return {
            paused:false,
            played:false,
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
                "player-next": this.invokePlayer("next")/*,
                "player-inject": this.onPlayerInject*/
            }
        });
    }

    getPlayer() {
        if(!this._player) {
            let dp = players["default"];
            if(dp) {
                this._player = dp.factory();
            }
        }
        return this._player;
    }

    init() {
        //this.rpc.call("player-get")({url: window.location.href})
        //        .then(this.onPlayerInject.bind(this));
    }

    onPlayerInject(player) {
        console.debug("Inject player:", player);
        if(!player) {
            return;
        }
        let type = this.players[player.name];
        this.initPlayer(type);
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
}

console.debug('Begin content init');
content = new Content();

content.init();
console.debug('Content inited');