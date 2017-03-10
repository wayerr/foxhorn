
let opts = new Opts();

function saveOptions(e) {
    e.preventDefault();
    let data = {};
    opts.forEach((key, desc) => {
        data[key] = document.getElementById(desc.elem).value;
    });
    opts.save(data);
}

function restoreOptions() {

    var loader = opts.load();
    loader.then((data) => {
        opts.forEach((key, desc) => {
            document.getElementById(desc.elem).value = data[key];
        });
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("opts-save").addEventListener("click", saveOptions);
document.getElementById("opts-clear").addEventListener("click", () => {
     browser.storage.local.clear().catch(e => {console.debug("Can not clear options:", e);});
});