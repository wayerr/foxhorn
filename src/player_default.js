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

class DefaultPlayer {

    static factory() {
        let player = new DefaultPlayer();
        console.debug("Begin create proxy");
        let w = window.wrappedJSObject;
        let handler = {
            construct: (target, argumentsList, newTarget) => {
                try {
                    let res = Reflect.construct(target, argumentsList);
                    console.debug("New audio created: ", res);
                    res.addEventListener("play", (e) => {
                        console.debug("Change player due to 'play' event:", e);
                        player.setMedia(e.target);
                    });
                    player.setMedia(res);
                    return res;
                } catch (e) {
                    console.debug("Cannot create", e);
                }
            }
        };
        w.Audio = new w.Proxy(w.Audio, cloneInto(handler, w, {cloneFunctions:true}));
        console.debug("End create proxy");
        return player;
    }

    constructor() {
        this.callback = (e) => {
            content.playerUpdated();
        };
    }

    findMedia() {
        var items = [];
        let forEachTag = (tag, handler) => Array.prototype.forEach.call(document.getElementsByTagName(tag), handler);
        forEachTag("audio", (a) => items.push(a));
        forEachTag("video", (a) => items.push(a));
        // we can not support cases when page contains many media elements
        if(items.length !== 1) {
            console.debug("Too many media on page:", items);
            return;
        }
        this._media = items[0];
    }

    getMedia() {
        if(!this._media) {
            this.findMedia();
        }
        return this._media;
    }

    play() {
        let m = this.getMedia();
        if(!m) {
            return;
        }
        if(m.paused) {
            m.play();
        } else {
            m.pause();
        }
    }

    next() {}

    prev() {}

    getState() {
        let media = this.getMedia();
        let track = {
            id:"track",
            title:document.title,
            position: media.currentTime,
            duration: media.duration
        };
        return {
            paused: media.paused,
            tracks: [track]
        };
    }
    
    setMedia(newmedia) {
        if(this._media === newmedia) {
            return;
        }
        let old = this._media;
        if(old) {
            old.removeEventListener("changed", this.callback);
            old.removeEventListener("load", this.callback);
        }
        this._media = newmedia;
        newmedia.addEventListener("changed", this.callback);
        newmedia.addEventListener("load", this.callback);
        content.playerUpdated();
    }
}

content.initPlayer(DefaultPlayer);