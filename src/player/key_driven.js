class KeyboardDrivenPlayer {

    static factory() {
        return new KeyboardDrivenPlayer({
            play:'p',
            next:'l',
            prev:'k'
        });
    }

    constructor(keys) {
        this.keys = keys;
    }

    pressKey(key) {
        function createEvent(type) {
            let uk = key.toUpperCase();
            let e = new KeyboardEvent(type, {
                key: key,
                keyCode: uk.charCodeAt(0),
                code: "Key" + uk,
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

content.initPlayer(KeyboardDrivenPlayer);