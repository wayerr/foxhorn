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

foxhorn_player = new class {

    constructor() {
        this._ev_context = "foxhorn_Vk_player_agent";
        this.features = new Set([foxhorn.F_PROGRESS_EVENT]);
    }

    open() {
        ap.on(this._ev_context, "update", foxhorn.playerUpdated);
        ap.on(this._ev_context, "play", foxhorn.playerUpdated);
        ap.on(this._ev_context, "progress", foxhorn.playerProgress);
    }

    close() {
        ap.off(this._ev_context);
    }

    play() {
        if(ap.isPlaying()) {
            ap.pause();
        } else {
            ap.play();
        }
    }

    next() {
        ap.playNext();
    }

    prev() {
        ap.playPrev();
    }

    getProgress() {
        return ap.getCurrentProgress();
    }

    isPlaying() {
        return ap.isPlaying();
    }

    hasMedia() {
        // getCurrentAudio - return false when no media, or [] - when exists
        return !!ap.getCurrentAudio();
    }

    getTrack() {
        let ct = ap.getCurrentAudio();
        if(!ct) {
            return null;
        }
        let p = ap.getCurrentProgress();
         //["", "", "", "Highway Star", "Deep Purple", 365, 0, 0, "", 0, 520, "", "[]", ""]
        let artist = ct[4];
        let duration = ct[5];
        return {
            id:"track",
            title: ct[3] + (artist? ` - ${artist}` : ""),
            position: duration * p,
            duration: duration
        };
    }
};
