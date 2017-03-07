document.addEventListener("click", (e) => {
    let id = e.target.id;
    if(id) {
        browser.runtime.sendMessage({method:id}).then(null, (e) => console.error(`On '${id}' got error: ${e}`));
    }
    e.preventDefault();
});

class Popup {
    constructor() {

    }

    init() {
        this.rpc = new Rpc({
            methods:{
                "on-player-update": this.onPlayerUpdate
            }
        });
    }

    onPlayerUpdate(data) {
        console.debug("Player updated with: ", data);
    }
}

let popup = new Popup();
popup.init();