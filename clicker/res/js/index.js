let items = {
    wood: {
        display: $('#wood-amount'),
        amount: 0
    },
    wheat: {
        display: $('#wheat-amount'),
        amount: 0
    },
    stone: {
        display: $('#stone-amount'),
        amount: 0
    }
}

Object.keys(items).forEach(i => items[i].display.on(`${i}_increment`,() => items[i].display.text(items[i].amount)));


$($('.card')).click(
    (d) => {
        let name = $(d.delegateTarget).attr('data-name').toLowerCase();
        console.log(name);
        if (items[name]){
            items[name].amount ++;
            items[name].display.trigger(`${name}_increment`);
        }
    }
)

function changeTab(tabName){
    $('.tab').each((i,t) => {
        if ($(t).attr('id') !== tabName)
            $(t).hide();
        else
            $(t).show();
    })
}

$('.nav-item').each((i,e) => {
    $(e).on('click', () => {
        if ($(e).attr('data-tab') === 'timeline'){
            window.location.href = `${window.location.origin}/clicker/timeline.html`;
            return;
        }
        changeTab($(e).attr('data-tab'));
    })
})