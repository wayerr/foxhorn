class DefaultPlayer {

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
            tracks: [track]
        };
    }
}

content.initPlayer(DefaultPlayer);