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
            this._events = ["play", "pause", "ended"];
            this.callback = (e) => {
                foxhorn.playerUpdated();
            };

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
            this.setMedia(items[0]);
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


        getProgress() {
            let m = this.getMedia();
            if(!m) {
                return 0;
            }
            return m.duration / m.currentTime;
        }

        isPlaying() {
            let m = this.getMedia();
            return !m.paused;
        }

        hasMedia() {
            let m = this.getMedia();
            return m && m.readyState !== m.HAVE_NOTHING;
        }

        getTrack() {
            let media = this.getMedia();
            return {
                id:"track",
                title:document.title,
                position: media.currentTime,
                duration: media.duration
            };
        }

        unsubscribe() {
            let old = this._media;
            if(old) {
                for(let e of this._events) {
                    old.removeEventListener(e, this.callback);
                }
            }
        }

        close() {
            if(this._audio) {
                Audio = this._audio;
            }
            this.unsubscribe();
        }

        setMedia(newmedia) {
            if(this._media === newmedia) {
                return;
            }
            this.unsubscribe();
            this._media = newmedia;
            for(let e of this._events) {
                newmedia.addEventListener(e, this.callback);
            }
            foxhorn.playerUpdated();
        }
    }

    foxhorn.setPlayer(new DefaultPlayer());
}