document.addEventListener("click", (e) => {
    let id = e.target.id
    if(id) {
        browser.runtime.sendMessage({method:id}).then(null, (e) => console.error(`On '${id}' got error: ${e}`));
    }
    e.preventDefault();
});
