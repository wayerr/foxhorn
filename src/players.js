//TODO we need:
// 1 detect that page may have media by url or 'mute' state
// 2 preload bare script only to choose pages and try to init players here
// 3 allow to load players from user defined sources


class Player {
    play() {}
    pause() {}
    next() {}
    prev() {}
    getState() {
        return {
            paused:false,
            played:false,
            /* max tracks - 10 */
            tracks: [
                /*{id:obj, title:"text", duration: 213454 /*seconds*/, current: true/false} */
            ]
        };
    }
}

class DefaultPlayer extends Player {

    static factory(document) {
        var items = [];
        let forEachTag = (tag, handler) => Array.prototype.forEach.call(document.getElementsByTagName(tag), handler);
        forEachTag("audio", (a) => items.push(a));
        forEachTag("video", (a) => items.push(a));
        if(items.length != 1) {
            return;
        }
        return new DefaultPlayer(items[0]);
    }

    constructor(tag) {
        this.media = tag;
        items.forEach(item => {
            if(item.paused) {
                item.play();
            } else if(item.played) {
                item.pause()
            }
        });
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
        return {
            paused: media.paused,
            played: media.played,
            tracks: [
                {id:"track", title:"current media", duration: media.duration, current: true}
            ]
        };
    }
}

class YandexMusicPlayer extends Player {
    static factory(document) {
    }
}
