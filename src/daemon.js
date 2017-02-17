class Daemon {
    constructor() {
        this.player = {
            tabId: null
        };
        this.cmdHandlers = {
            "cmd-play": this.invokePlayer("play"),
            "cmd-prev": this.invokePlayer("prev"),
            "cmd-next": this.invokePlayer("next")
        };
        this.msgHandlers = {
            "player-play": this.invokePlayer("play"),
            "player-prev": this.invokePlayer("prev"),
            "player-next": this.invokePlayer("next")
        };
    }

    init() {
        let listen = (src, func) => {
            src.addListener(func.bind(this));
        };

        listen(browser.commands.onCommand, this.onCommand);
        listen(browser.runtime.onMessage, this.onMessage);
        listen(browser.webNavigation.onCompleted, this.onPageChanged);
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
            console.warn(`Unexpected message '${msg}' without 'method' field`);
            return;
        }
        let handler = this.msgHandlers[method];
        if(!handler) {
            console.warn(`Can not find handler for method '${method}' of message:`, msg);
            return;
        }
        let arg = {
            message: msg,
            sender: sender,
            sendResponse: (e) => sendResponse(e) // it prevent warning
        };
        handler(arg);
    }

    invokePlayer(method) {
        return (arg) => {
            let player = this.player;
            if(!player.tabId) {
                console.debug("no tab in player:", player);
                return;
            }
            let msg = {
                method:method
            };
            let proxy = arg.sendResponse;
            console.debug("Send msg ", msg, ` to player in tab '${player.tabId}'`);
            browser.tabs.sendMessage(player.tabId, msg)
               .then(proxy, (e) => console.error(`On send '${method}' to content we got error: ${e}`));
        };
    }

    resolvePlayer(url) {
        return "player_default";
    }

    onPageChanged(e) {
        if(e.frameId !== 0) {
            return;
        }
        console.debug("PAGE CHANGED:", e);
        let playerName = this.resolvePlayer(e.url);
        let isPlayerTab = this.player.tabId === e.tabId;
        if(!playerName) {
            if(isPlayerTab) {
                // clean player
                this.player.tabId = null;
            }
            return;
        }
        if(isPlayerTab && this.player.name === playerName) {
            // nothing changed
            return;
        }
        this.player.tabId = e.tabId;
        this.player.name = playerName;
        console.debug(`Inject player driver to tab '${e.tabId}' url '${e.url}'`);
        
        browser.tabs.executeScript(e.tabId, {file:"src/content.js"})
                .then(null, (e) => console.error('On inject player driver we got error:', e));
    }
}

let daemon = new Daemon();

daemon.init();