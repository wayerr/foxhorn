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

{
    class DefaultPlayer {

        constructor() {
            this.callback = (e) => {
                content.playerUpdated();
            };
            // api has event too noizy, so we use simply timeout per 2 seconds

            this.iid = window.setInterval(() => {
                let m = this.getMedia();
                if(!m || !m.played) {
                    // we ignore event when nothing is played
                    return;
                }
                foxhorn.playerUpdated();
            }, 2000);

            console.debug("Begin create proxy");
            this._audio = Audio;
            let handler = {
                construct: (target, argumentsList, newTarget) => {
                    try {
                        let res = Reflect.construct(target, argumentsList);
                        console.debug("New audio created: ", res);
                        res.addEventListener("play", (e) => {
                            console.debug("Change player due to 'play' event to: ", e.target);
                            this.setMedia(e.target);
                        });
                        this.setMedia(res);
                        return res;
                    } catch (e) {
                        console.debug("Cannot create", e);
                    }
                }
            };
            Audio = new Proxy(Audio, handler);
            console.debug("End create proxy");
        }

        findMedia() {
            var items = [];
            let forEachTag = (tag, handler) => Array.prototype.forEach.call(document.getElementsByTagName(tag), handler);
            forEachTag("audio", (a) => items.push(a));
            forEachTag("video", (a) => items.push(a));
            // we can not support cases when page contains many media elements
            if(items.length !== 1) {
                console.debug("Can not resolve media on page:", items);
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
            console.debug("PLAY");
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
            if(!media) {
                return {paused:true, tracks: []};
            }
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

        unsubscribe() {
            let old = this._media;
            if(old) {
                old.removeEventListener("changed", this.callback);
                old.removeEventListener("load", this.callback);
            }
        }

        close() {
            if(this._audio) {
                Audio = this._audio;
            }
            window.clearInterval(this.iid);
            this.unsubscribe();
        }

        setMedia(newmedia) {
            if(this._media === newmedia) {
                return;
            }
            this.unsubscribe();
            this._media = newmedia;
            newmedia.addEventListener("changed", this.callback);
            newmedia.addEventListener("load", this.callback);
            foxhorn.playerUpdated();
        }
    }

    foxhorn.setPlayer(new DefaultPlayer());
}