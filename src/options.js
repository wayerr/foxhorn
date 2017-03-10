
const opts = {
    players: {
        elem: "site-player-mapping",
        def: "domain:music.yandex.ru   player_yandex\n"+
             "#domain:example.com      player_default"
    }
};

function forEachOpt(callback) {
    for(let key in opts) {
      let desc = opts[key];
      callback(key, desc);
  }
}

function saveOptions(e) {
    e.preventDefault();
    let data = {};
    forEachOpt((key, desc) => {
        data[key] = document.getElementById(desc.elem).value;
    });
    console.debug("Save opts:", data);
    browser.storage.local.set(data);
}

function restoreOptions() {

    function setCurrentChoice(readed) {
        var data;
        if(Object.keys(readed).length !== 0) {
            data = readed;
            console.debug("Load opts:", data);
        } else {
            data = {};
            forEachOpt((key, desc) => data[key] = desc.def);
            console.debug("Use default opts:", data);
        }
        forEachOpt((key, desc) => {
            document.getElementById(desc.elem).value = data[key];
        });
    }

    var promise = browser.storage.local.get();
    promise.then(setCurrentChoice, (e) => console.log(`Error: ${e}`));
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);