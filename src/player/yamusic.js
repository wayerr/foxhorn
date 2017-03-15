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
    class YaMusicPlayer {

        constructor() {
            this.features = new Set([foxhorn.F_PROGRESS_EVENT]);
        }

        open() {
            externalAPI.on(externalAPI.EVENT_STATE, foxhorn.playerUpdated);
            externalAPI.on(externalAPI.EVENT_TRACK, foxhorn.playerUpdated);
            externalAPI.on(externalAPI.EVENT_PROGRESS, foxhorn.playerProgress);
        }


        close() {
            externalAPI.off(externalAPI.EVENT_STATE, foxhorn.playerUpdated);
            externalAPI.off(externalAPI.EVENT_TRACK, foxhorn.playerUpdated);
            externalAPI.off(externalAPI.EVENT_PROGRESS, foxhorn.playerProgress);
        }

        play() {
            let p = externalAPI.getProgress();
            if(externalAPI.isPlaying() || p.position > 0) {
                externalAPI.togglePause();
            } else {
                externalAPI.play();
            }
        }

        next() {
            externalAPI.next();
        }

        prev() {
            externalAPI.prev();
        }
        
        getProgress() {
            let p = externalAPI.getProgress();
            if(!p) {
                return 0;
            }
            return p.duration / p.postion;
        }

        isPlaying() {
            return externalAPI.isPlaying();
        }

        hasMedia() {
            return externalAPI.getCurrentTrack() !== null;
        }

        getTrack() {
            let ct = externalAPI.getCurrentTrack();
            let p = externalAPI.getProgress();
            let album = ct.album.title || '<unknown>';
            let artist = ct.album.artists && ct.album.artists[0].title || '<unknown>';
            return {
                id:"track",
                title:`${ct.title} - ${album} - ${artist}`,
                position: p.position,
                duration: p.duration
            };
        }
    };

    foxhorn.setPlayer(new YaMusicPlayer());
}