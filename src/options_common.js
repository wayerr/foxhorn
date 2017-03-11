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

class Opts {
    constructor() {
        this.opts = {
            sites: {
                elem: "site-player-mapping",
                def: "domain:music.yandex.ru   yamusic\n"+
                     "#domain:example.com      default"
            }
        };
        this.loader = null;
        this.rpc = new Rpc();
    }
    
    forEach(callback) {
        for(let key in this.opts) {
          let desc = this.opts[key];
          callback(key, desc);
      }
    }

    load() {
        if(this.loader !== null) {
            return this.loader;
        }
        return this.loader = new Promise((resolve, reject) => {
            let atLoad = (readed) => {
                var data = {};
                readed = readed || {};
                this.forEach((key, desc) => {
                    data[key] = readed[key] || desc.def;
                });
                console.debug("Load opts:", data);
                resolve(data);
            };

            var p = browser.storage.local.get();
            p.catch((e) => {
                console.log(`Can not load options: ${e}`);
                //then use defaults
                atLoad(null);
            });
            p.then(atLoad);
        });
    }

    save(data) {
        console.debug("Save opts:", data);
        this.loader = null;
        let p = browser.storage.local.set(data);
        p.catch((e) => console.log(`Can not save options: ${e}`));
        p.then(() => this.rpc.call("opts-save")());
    }
}


