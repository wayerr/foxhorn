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

class YaMusicPlayer {

    static factory() {
        return new YaMusicPlayer();
    }

    constructor() {
        this.listener = cloneInto(() => {
            content.playerUpdated();
        }, content.unwrap(window), {cloneFunctions:true});
        this._api = null;
        // api has event like PROGRESS but it too noizy, so we use simply timeout per 2 seconds
        let iid = window.setInterval(() => {
            let api = this.api();
            if(!api || !api.isPlaying()) {
                // we ignore event when nothing is played
                return;
            }
            content.playerUpdated();
        }, 2000);
        content.onUnload(() => {
            this.close();
            window.clearInterval(iid);
        });
    }

    api() {
        let api = content.unwrap(window).externalAPI;
        if(this._api !== api) {
            this.unsubscribe();
            if(api) {
                api.on(api.EVENT_STATE, this.listener);
                api.on(api.EVENT_TRACK, this.listener);
            }
        }
        this._api = api;
        return api;
    }

    close() {
        this.unsubscribe();
    }

    unsubscribe() {
        if(this._api) {
            this._api.off(this._api.EVENT_STATE, this.listener);
            this._api.off(this._api.EVENT_TRACK, this.listener);
        }
    }

    play() {
        let api = this.api();
        if(!api) {
            return;
        }
        let p = api.getProgress();
        if(api.isPlaying() || p.position > 0) {
            api.togglePause();
        } else {
            api.play();
        }
    }

    next() {
        this.api().next();
    }

    prev() {
        this.api().prev();
    }

    getState() {
        let api = this.api();
        if(!api) {
            return {paused:true, tracks: []};
        }
        let ct = api.getCurrentTrack();
        let p = api.getProgress();
        let album = ct.album.title || '<unknown>';
        let artist = ct.album.artists && ct.album.artists[0].title || '<unknown>';
        let track = {
            id:"track",
            title:`${ct.title} - ${album} - ${artist}`,
            position: p.position,
            duration: p.duration
        };
        return {
            paused: !api.isPlaying(),
            tracks: [track]
        };
    }
};

content.initPlayer(YaMusicPlayer);
