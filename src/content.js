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
            current: {/*track*/},
            // list of tracks is not required
            tracks: [
                {/*track*/},
                {/*track*/}
            ]
        };
    }
}

function pressKey(key) {
    function createEvent(type) {
        let e = document.createEvent("KeyboardEvent");
        let initMethod = typeof e.initKeyboardEvent !== 'undefined' ? "initKeyboardEvent" : "initKeyEvent";
        e[initMethod](type, true, true, window, false, false, false, false, key, key);
        return e;
    }
    document.dispatchEvent(createEvent("keydown"));
    document.dispatchEvent(createEvent("keypress"));
    document.dispatchEvent(createEvent("keyup"));
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
            current: track,
            tracks: []
        };
    }
}

class KeyboardDrivenPlayer extends Player {
    static factory() {
    }
};

class Content {
    constructor() {
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
    }

    onMessage(msg, sender, sendResponse) {
        console.debug("MSG:", msg);
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
        let res = func();
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
