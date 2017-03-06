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
            // each track: {id:obj, title:"text", duration: 213454 /*seconds*/}
            //
            // list of tracks is not required
            tracks: [
                {/*track*/},
                {/*track*/}
            ]
        };
    }
}

class DefaultPlayer extends Player {

    static factory() {
        var items = [];
        let forEachTag = (tag, handler) => Array.prototype.forEach.call(document.getElementsByTagName(tag), handler);
        forEachTag("audio", (a) => items.push(a));
        forEachTag("video", (a) => items.push(a));
        // we can not support cases when page contains many media elements
        if(items.length !== 1) {
            console.error("Too many media on page:", items);
            return;
        }
        return new DefaultPlayer(items[0]);
    }

    constructor(tag) {
        super();
        this.media = tag;
    }

    play() {
        this.media.play();
    }
    pause() {
        this.media.pause();
    }
    next() {}
    prev() {}
    getState() {
        let media = this.media;
        let track = {id:"track", title:"current media", duration: media.duration, current: true};
        return {
            paused: media.paused,
            played: media.played,
            tracks: [track]
        };
    }
}

class KeyboardDrivenPlayer extends Player {

    static factory() {
        return new KeyboardDrivenPlayer({
            play:'p',
            next:'l',
            prev:'k'
        });
    }

    constructor(keys) {
        super();
        this.keys = keys;
    }

    pressKey(key) {
        function createEvent(type) {
            let e = new KeyboardEvent(type, {
                key: key,
                code: "Key" + key.toUpperCase(),
                bubbles: true,
                cancelable: true
            });
            return e;
        }

        console.debug("press key:", key, " in ", document);
        try {
            document.dispatchEvent(createEvent("keydown"));
            document.dispatchEvent(createEvent("keypress"));
            document.dispatchEvent(createEvent("keyup"));
        } catch (e) {
            console.error(e);
        }
    }

    play() {
        this.pressKey(this.keys.play);
    }

    pause() {
        this.pressKey(this.keys.pause || this.keys.play);
    }

    next() {
        this.pressKey(this.keys.next);
    }

    prev() {
        this.pressKey(this.keys.prev);
    }

    getState() {
        let track = {id:"track", title:"current media", duration: null};
        return {
            paused: false,
            played: false,
            tracks: [track]
        };
    }

};

class Content {
    constructor() {
        let ps = this.players = {};
        for(let p of [KeyboardDrivenPlayer, DefaultPlayer]) {
            ps[p.name] = p;
        }
        this._player = null;
    }

    getPlayer() {
        if(!this._player) {
            this._player = DefaultPlayer.factory();
        }
        return this._player;
    }

    init() {
        let listen = (src, func) => {
            src.addListener(func.bind(this));
        };
        listen(browser.runtime.onMessage, this.onMessage);
        let msg = {
            method:"player-get",
            arg: {
                url: window.location.href
            }
        };
        browser.runtime.sendMessage(msg).then((player) => {
            console.debug("Receive player:", player);
            if(!player) {
                return;
            }
            let type = this.players[player.name];
            console.debug("Use player type :", type);
            if(type) {
                this._player = type.factory();
                console.debug("Make player: ", this._player);
            }
        }, console.error);
    }

    onMessage(msg, sender, sendResponse) {
        console.debug("msg in content:", msg);
        let player = this.getPlayer();
        if(!player) {
            console.warn('No initialised player');
            return;
        }
        let method = msg.method;
        let func = player[method];
        if(!func) {
            console.error(`No '${method}' in player: ${player}`);
            return;
        }
        let res = func.apply(player);
        sendResponse(res);
    }
}

console.error('Begin content init');
try {
    let content = new Content();

    content.init();
    console.debug('Content inited');
} catch (e) {
    console.error('Can not init content due to error:', e);
}
