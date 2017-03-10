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
                "player-get": this.resolvePlayer,
                "opts-save": this.loadOpts
            },
            handlers: {
                "player-play": this.invokePlayer("player-play"),
                "player-prev": this.invokePlayer("player-prev"),
                "player-next": this.invokePlayer("player-next"),
                "player-get-state": this.invokePlayer("player-get-state")
            }
        });
        this.opts = new Opts();
        this.sites = [];
        this.loadOpts();
    }

    init() {
        console.debug("Init Daemon part of FoxHorn.");
        let listen = (src, func) => {
            src.addListener(func.bind(this));
        };

        listen(browser.commands.onCommand, this.onCommand);
        listen(browser.webNavigation.onCompleted, this.onPageChanged);

    }

    loadOpts() {
        this.sites = [];
        this.opts.load().then(this.onOptsLoaded.bind(this));
    }

    onOptsLoaded(data) {
        for(let line of data.sites.split('\n')) {
            if(line.startsWith("#")) {
                continue;
            }
            let arr = line.split(/\s+/);
            if(arr.length < 2) {
                console.error("Invalid site line:", line);
                continue;
            }
            let expr = arr[0];
            let colonPos = expr.indexOf(':');
            if(colonPos < 1 || colonPos > expr.length - 2) {
                console.error("Invalid pattern in site line:", line);
                continue;
            }
            let exprProto = expr.substring(0, colonPos);
            let exprData = expr.substring(colonPos + 1);
            let player = arr[1];
            var matcher = null;
            if(exprProto === "domain") {
                matcher = (data) => {
                    if(exprData === data.domain) {
                        return player;
                    }
                };
            } else {
                console.error("Invalid protocol '", exprProto, "' in site line:", line);
                continue;
            }
            this.sites.push({
                expr: expr,
                player: player,
                matcher: matcher
            });
        }
        this.findPlayer();
    }

    findPlayer() {
        browser.tabs.query({})
                .then((tabs) => {
            for(let tab of tabs) {
                let player = this.resolvePlayer({url: tab.url});
                if(!player) {
                    continue;
                }
                this.injectPlayer({
                    tabId: tab.id,
                    player: player.name,
                    url: tab.url
                });
            }
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
        let url = arg.url;
        let rr = /https?:\/\/([^:/]+)/.exec(url);
        if(!rr) {
            // it happen when url looks like 'about:config'
            return;
        }
        let domain = rr[1];
        let data = {
            url: url,
            domain: domain
        };
        var player = null;
        for(let site of this.sites) {
            player = site.matcher(data);
            if(player) {
                break;
            }
        }
        if(player) {
            console.debug("Found player:", player, " for ", data);
            return {name:player};
        }
        return null;
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

        function executor(arr) {
            let src = arr.shift();
            console.debug("Execute ", src, " in ", arg.tabId);
            let promise = browser.tabs.executeScript(arg.tabId, {file: src, runAt:"document_start"});
            promise.catch((e) => console.error('On exec ', src, ' we got error:', e));
            if(arr.length > 0) {
                promise.then(() => executor(arr));
            }
        };
        executor(["src/common.js", "src/content.js", `src/player_${arg.player}.js`]);
    }
}

//common.test();
let daemon = new Daemon();

daemon.init();