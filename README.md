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

 - `Ctrl+Shift+End` - Toggle play/pause
 - `Ctrl+Shift+Left` - Next track (not all players support)
 - `Ctrl+Shift+Right` - Previous track  (not all players support)

## Supported sites

Currently supported players:

* music.yandex.ru
* youtube (through 'default' player)
* vk.com

Support planned:

* bandcamp.com
* soundcloud.com
