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

    static factory() {/*
        var items = [];
        let forEachTag = (tag, handler) => Array.prototype.forEach.call(document.getElementsByTagName(tag), handler);
        forEachTag("audio", (a) => items.push(a));
        forEachTag("video", (a) => items.push(a));
        // we can not support cases when page contains many media elements
        if(items.length !== 1) {
            console.error("Too many media on page:", items);
            return;
        }
        return new DefaultPlayer(items[0]);*/
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
                    let callback = (e) => {
                        content.playerUpdated();
                    };
                    res.addEventListener("changed", callback);
                    res.addEventListener("load", callback);
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

        
    }

    play() {
        console.debug("PLAY{");
        if(!this.media) {
            return;
        }
        if(this.media.paused) {
            this.media.play();
        } else {
            this.media.pause();
        }
        console.debug("}");
    }
    pause() {
        this.media.pause();
    }
    next() {}
    prev() {}
    getState() {
        let media = this.media;
        let track = {id:"track", title:document.title, duration: media.duration};
        return {
            paused: media.paused,
            tracks: [track]
        };
    }
    setMedia(newmedia) {
        if(this.media === newmedia) {
            return;
        }
        this.media = newmedia;
        content.playerUpdated();
    }
}

content.initPlayer(DefaultPlayer);