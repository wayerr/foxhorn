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
            "player-next": this.invokePlayer("next"),
            "player-get": this.dispatch(this.resolvePlayer)
        };
    }

    init() {
        console.debug("Init Daemon part of FoxHorn.");
        let listen = (src, func) => {
            src.addListener(func.bind(this));
        };

        listen(browser.commands.onCommand, this.onCommand);
        listen(browser.runtime.onMessage, this.onMessage);
        listen(browser.webNavigation.onCompleted, this.onPageChanged);

        this.findPlayer();
    }

    dispatch(method) {
        return (arg) => {
            console.debug("Call of ", method, " with ", arg);
            try {
                let res = method.apply(this, [arg.arg]);
                console.debug("Call of ", method, " got ", res);
                arg.sendResponse(res);
            } catch(e) {
                console.error("Fail to call " , method, " due to error:", e);
            }
        };
    }

    findPlayer() {
        if(this.player.tabId !== null) {
            return;
        }
        browser.tabs.query({audible:true}).then((tabs) => {
            if(tabs.length < 1) {
                return;
            }
            //simply choose first auduble tab
            let tab = tabs[0];
            let player = this.resolvePlayer({url: tab.url});
            this.injectPlayer({
                tabId: tab.id,
                player: player.name,
                url: tab.url
            });
        });
    }

    onCommand(cmd) {
        console.debug("cmd in daemon:", cmd);
        let handler = this.cmdHandlers[cmd];
        if(handler) {
            let arg = {arg: {}, sender: null, sendResponse: () => {}};
            handler(arg);
        }
    }

    onMessage(msg, sender, sendResponse) {
        console.debug("msg in daemon:", msg);
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
            arg: msg.arg || {},
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
                method: method,
                arg: arg.arg
            };
            let proxy = arg.sendResponse;
            console.debug("Send msg ", msg, ` to ${player}`);
            browser.tabs.sendMessage(player.tabId, msg)
               .then(proxy, (e) => console.error(`On send '${method}' to content we got error: ${e}`));
        };
    }

    resolvePlayer(arg) {
        if(arg.url.indexOf("music.yandex") > 0) {
            return {name:"KeyboardDrivenPlayer"};
        }
        return {name:"DefaultPlayer"};
    }

    onPageChanged(e) {
        if(e.frameId !== 0) {
            return;
        }
        console.debug("PAGE CHANGED:", e);
        let playerSrc = this.resolvePlayer({url: e.url});
        let isPlayerTab = this.player.tabId === e.tabId;
        if(!playerSrc) {
            if(isPlayerTab) {
                // clean player
                this.player.tabId = null;
            }
            return;
        }
        if(isPlayerTab && this.player.name === playerSrc.name) {
            // nothing changed
            return;
        }
        this.injectPlayer({
            tabId: e.tabId,
            player: playerSrc.name,
            url: e.url
        });
    }

    injectPlayer(arg) {
        console.debug(`Inject player driver '${arg.player}' to tab '${arg.tabId}' url '${arg.url}'`);
        this.player = {
            tabId: arg.tabId,
            name: arg.player,
            url: arg.url,
            toString: function() {
                return `${this.name}('${this.url}' in ${this.tabId} tab)`;
            }
        };

        browser.tabs.executeScript(arg.tabId, {file:"src/content.js"})
                .then(null, (e) => console.error('On inject player driver we got error:', e));
    }
}

let daemon = new Daemon();

daemon.init();