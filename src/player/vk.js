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
    class VkPlayer {

        constructor() {
            this._ev_context = "foxhorn_Vk_player_agent";
            this.listener = () => {
                foxhorn.playerUpdated();
            };
            this._api = null;
            // api has event like PROGRESS but it too noizy, so we use simply timeout per 2 seconds
            this.iid = window.setInterval(() => {
                let api = this.api();
                if(!api || !api.isPlaying()) {
                    // we ignore event when nothing is played
                    return;
                }
                foxhorn.playerUpdated();
            }, 2000);
        }

        api() {
            let api = ap;
            if(this._api !== api) {
                this.unsubscribe();
                if(api) {
                    api.on("update", this.listener);
                    api.on("play", this.listener);
                }
            }
            this._api = api;
            return api;
        }

        close() {
            window.clearInterval(this.iid);
            this.unsubscribe();
        }

        unsubscribe() {
            if(this._api) {
                this._api.off(this._ev_context);
            }
        }

        play() {
            let api = this.api();
            if(!api) {
                return;
            }
            if(api.isPlaying()) {
                api.pause();
            } else {
                api.play();
            }
        }

        next() {
            this.api().playNext();
        }

        prev() {
            this.api().playPrev();
        }

        getState() {
            let api = this.api();
            if(!api) {
                return {paused:true, tracks: []};
            }
             //["", "", "", "Highway Star", "Deep Purple", 365, 0, 0, "", 0, 520, "", "[]", ""]
            let ct = api.getCurrentAudio();
            let p = ap.getCurrentProgress();
            let artist = ct[4] || '<unknown>';
            let duration = ct[5];
            let track = {
                id:"track",
                title:`${ct[3]} - ${artist}`,
                position: duration * p,
                duration: duration
            };
            return {
                paused: !api.isPlaying(),
                tracks: [track]
            };
        }
    };

    foxhorn.setPlayer(new VkPlayer());
}