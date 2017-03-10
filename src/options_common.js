
class Opts {
    constructor() {
        this.opts = {
            sites: {
                elem: "site-player-mapping",
                def: "domain:music.yandex.ru   yandex\n"+
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


