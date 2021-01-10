
// Constants
const engine = new Engine();

function Ready(){

    var savedGame = engine.Load();

    if (savedGame !== undefined && savedGame !== null && savedGame !== "")
    {
        engine.Resume(savedGame);
    }
    else{
        var elements = [];
        $.each($("#Elements").find("td"), function (i, e) {
            var attrib = $(e).attr('class');
            if (attrib === null || attrib === undefined || attrib.includes('none') || elements.includes(e))
                return;
            elements.push(e);
        })
        engine.Start(elements);
    }
}

$.getJSON('/wwwroot/json/visitors.json', function(json){
    console.log(json);
})