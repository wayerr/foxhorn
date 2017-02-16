class Daemon {
    constructor() {
        this.player = null;
        this.cmdHandlers = {
            "cmd-play": this.invokePlayer("play"),
            "cmd-prev": this.invokePlayer("prev"),
            "cmd-next": this.invokePlayer("next"),
        };
        this.msgHandlers = {
            "player-play": this.invokePlayer("play"),
            "player-prev": this.invokePlayer("prev"),
            "player-next": this.invokePlayer("next"),
        };
    }

    onCommand(cmd) {
        console.debug("CMD:", cmd);
        let handler = this.cmdHandlers[cmd];
        if(handler) {
            handler();
        }
    }

    onMessage(msg, sender, sendResponse) {
        console.debug("MSG:", msg);
        let method = msg.method;
        if(!method) {
            console.warning(`Can not find handler for method '${method}' of message '${msg}'`);
            return;
        }
        let handler = this.msgHandlers[method];
        if(handler) {
            handler({message: msg, sender: sender, sendResponse: sendResponse});
        }
    }

    invokePlayer(method) {
        let player = this.player;
        if(!player) {
            return;
        }
        let func = player[method];
        if(!func) {
            console.error(`Unknown method '${method}' in player '${player}'`);
            return;
        }
        func();
    }
}

let daemon = new Daemon();

browser.commands.onCommand.addListener(daemon.onCommand.bind(daemon));

browser.runtime.onMessage.addListener(daemon.onMessage.bind(daemon));
