# FoxHorn ![logo](https://raw.githubusercontent.com/wayerr/foxhorn/master/icons/logo-48.png)

Addon for FireFox and Chrome browsers. It allow to drive online media players (like music.yandex.ru, youtube, bandcamp & etc.).
FoxHorn fetures:

* hotkeys
* builtin support for any site which use `<audio>`/`<video>` tags or `Audio` js object. 
* user can customise list of 'online player' sites, by add site & player type

## Usage

Currently addon is under development, and not presented in browser markets. But you can install it manually from sources, see instructions for [Firefox](https://developer.mozilla.org/en-US/Add-ons/WebExtensions/Temporary_Installation_in_Firefox) and [Chrome](https://developer.chrome.com/extensions/getstarted#unpacked).

### Configuration

See options page of extension. Now it has  only list of 'enabled' sites. For example:
```
domain:music.yandex.ru   yamusic 
domain:www.youtube.com   default
#domain:example.com      default
```

### Hotkeys

 - `MediaPlayPause` - Toggle play/pause
 - `MediaNextTrack` - Next track (not all players support)
 - `MediaPrevTrack` - Previous track  (not all players support)

## Supported sites

Currently supported players:

* music.yandex.ru
* youtube (through 'default' player)
* vk.com

## Also you can add own player adapter 

See options page. Example player:

```js
foxhorn_player = new class {
    // declare player features:
    //    F_PROGRESS_EVENT - player can invoke foxhorn.playerProgress(),
    //                       when this feauture is not supported, plugin
    //                       will invoke this.getProgress() every second
    features: new Set([foxhorn.F_PROGRESS_EVENT])
    // lifecycle methods
    open: () => api.onEvent("update", foxhorn.playerProgress),
    close: () => api.offEvent("update", foxhorn.playerProgress),
    // toggle play/pause
    play: () => api.isPlaying()? api.pause() : api.play(),
    next: api.next,
    prev: api.prev,
    // return player progress as float between 0 - 1, be careful this may be called often
    getProgress: api.getProgress,
    // true only when playing, false otherwize (include paused)
    isPlaying: api.isPlaying,
    // mean that player has any playable media, when false - any non lifecycle
    // method will not been called
    hasMedia: () => !!api.getTrack(),
    getTrack: () => {
        let ct = api.getTrack();
        return {
            id:"track",
            title: ct.title,
            position: ct.duration * api.getProgress(),
            duration: ct.duration // number of track length in milliseconds
        };
    }
});
```
