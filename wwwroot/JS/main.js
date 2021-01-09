
// Constants
const engine = new Engine();

function Ready(){
    var elements = [];
    $.each($("#Elements").find("td"), function (i, e) {
        var attrib = $(e).attr('class');
        if (attrib === null || attrib === undefined || attrib.includes('none') || elements.includes(e))
            return;
        elements.push(e);
    })
    engine.Start(elements);
}