
function pressKey(key) {
    function createEvent(type) {
        let e = document.createEvent("KeyboardEvent");
        let initMethod = typeof e.initKeyboardEvent !== 'undefined' ? "initKeyboardEvent" : "initKeyEvent";
        e[initMethod](type, true, true, window, false, false, false, false, key, key);
        return e;
    }
    document.dispatchEvent(createEvent("keydown"));
    document.dispatchEvent(createEvent("keypress"));
    document.dispatchEvent(createEvent("keyup"));
}