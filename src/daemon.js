class Daemon {
    constructor() {
        this.player = {
            tabId: null
        };
        this.cmdHandlers = {
            "cmd-play": this.invokePlayer("player-play"),
            "cmd-prev": this.invokePlayer("player-prev"),
            "cmd-next": this.invokePlayer("player-next")
        };
        this.rpc = new Rpc({
            methods:{
                "player-get": this.resolvePlayer
            },
            handlers: {
                "player-play": this.invokePlayer("player-play"),
                "player-prev": this.invokePlayer("player-prev"),
                "player-next": this.invokePlayer("player-next")
            }
        });
    }

    init() {
        console.debug("Init Daemon part of FoxHorn.");
        let listen = (src, func) => {
            src.addListener(func.bind(this));
        };

        listen(browser.commands.onCommand, this.onCommand);
        listen(browser.webNavigation.onCompleted, this.onPageChanged);

        this.findPlayer();
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
        if(arg.url.indexOf("pleer.net") > 0) {
            return {name:"DefaultPlayer"};
        }
        return null;//;
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
                this.player = {};
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

        let errHandler = (e) => console.error('On inject player driver we got error:', e);
        browser.tabs.executeScript(arg.tabId, {file:"src/common.js"}).catch(errHandler)
                .then(() => {
                    browser.tabs.executeScript(arg.tabId, {file:"src/content.js"}).catch(errHandler);
                });
    }
}

//common.test();
let daemon = new Daemon();

daemon.init();