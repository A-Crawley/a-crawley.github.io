let game = 'Red';
const APIKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYyODcyMDgwOSwiZXhwIjoxOTQ0Mjk2ODA5fQ.G5wvnukpD9zTSykhMtodlzpWIz5fGToXUU613DGuF1s';

function pokemonSelector(pokemons,row){
  let html = `<select class="form-select selector-${row.id}" aria-label="Something" style=\'color:#CCC\' onchange="changeImage(this,'${row.id}')">`;
  html += '<option selected>Encounter</option>'
  pokemons.forEach(pkmn => {
    html += `<option value="${pkmn['PokedexNo']}" data-thumbnail="${pkmn.ImageUrl}">${pkmn['Pokemon Name']}</option>`
  })
  html += '</select>'

  return html;
}

function statusSelect(row){
  let html = '';
  html += `<select class="form-select status-${row.id}" style=\'color:#CCC\'>`;
  html += '<option selected>Status</option>';
  html += '<option value="1">Caught</option>';
  html += '<option value="2">Missed</option>';
  html += '<option value="3">Released</option>';
  html += '</select>';
  return html;
}

function changeImage(value,id){
  let thumbnail = $($(value).children(`option[value|=${value.value}]`)[0]).attr('data-thumbnail')
  $(`#thumbnail-${id}`).attr('src',thumbnail)
}

function partyCheckbox(row){
  let html = '';
  html += '<div class="d-flex flex-row">';
  html += `<div class="party ${row.id}">`;
  html += '<div class="">';
  html += '<input class="form-check-input" type="radio" name="radio-1" value="" aria-label="1">';
  html += '<label class="form-check-label" for="radio-1">&nbsp;1&nbsp;&nbsp;</label>'
  html += '<input class="form-check-input" type="radio" name="radio-2" value="" aria-label="2">';
  html += '<label class="form-check-label" for="radio-2">&nbsp;2&nbsp;&nbsp;</label>'
  html += '<input class="form-check-input" type="radio" name="radio-3" value="" aria-label="3">';
  html += '<label class="form-check-label" for="radio-3">&nbsp;3&nbsp;&nbsp;</label>'
  html += '</div><div class="">'
  html += '<input class="form-check-input" type="radio" name="radio-4" value="" aria-label="4">';
  html += '<label class="form-check-label" for="inlineRadio1">&nbsp;4&nbsp;&nbsp;</label>'
  html += '<input class="form-check-input" type="radio" name="radio-5" value="" aria-label="5">';
  html += '<label class="form-check-label" for="inlineRadio1">&nbsp;5&nbsp;&nbsp;</label>'
  html += '<input class="form-check-input" type="radio" name="radio-6" value="" aria-label="6">';
  html += '<label class="form-check-label" for="inlineRadio1">&nbsp;6&nbsp;&nbsp;</label>'
  html += '</div>';
  html += '</div>';
  html += '<div class="p-1 pt-2">'
  html += `<button class="btn btn-primary btn-sm" onClick="partyClear[\'${row.id}\']()">Clear</button>`;
  html += '</div>'
  html += '</div>';

  partyClear[row.id] = () => $($(`.${row.id}`).find('input')).each((_,i) => {$(i).prop("checked",false)});

  return html;
}

function removeSelections(row){
  let html = '';
  html += `<div>`
  html += `<button class="btn btn-outline-warning btn-sm" onclick="rowClear['${row.id}']()">`
  html += '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-lg" viewBox="0 0 16 16">'
  html += '<path d="M1.293 1.293a1 1 0 0 1 1.414 0L8 6.586l5.293-5.293a1 1 0 1 1 1.414 1.414L9.414 8l5.293 5.293a1 1 0 0 1-1.414 1.414L8 9.414l-5.293 5.293a1 1 0 0 1-1.414-1.414L6.586 8 1.293 2.707a1 1 0 0 1 0-1.414z"/>'
  html += '</svg>'
  html += '</button>'
  html += `</div>`

  rowClear[row.id] = () => {
    partyClear[row.id]();
    $(`select.status-${row.id} option:selected`).prop('selected',false);
    $(`select.selector-${row.id} option:selected`).prop('selected',false);
    $(`input.${row.id}`).val('');
  }

  return html;
}

partyClear = []
rowClear = []

new gridjs.Grid({
    columns: [
        {
          name: 'Image',
          formatter: (_,row) => gridjs.html(`<img id="thumbnail-${row.id}" src="" width="40"></img>`)
        },
        {name: "Route"}, 
        {
            name: "Encounter",
            formatter: (pkmns,row) => gridjs.html(pokemonSelector(pkmns,row)),
            width: "25%"
        }, 
        {
          name:"Nickname",
          formatter: (_, row) => gridjs.html(`<input type="text" class="form-control ${row.id}" placehholder="Nickname" style=\'color:#CCC\'></input>`),
          width: "25%"
        },
        {
          name:"Status",
          formatter: (_,row) => gridjs.html(statusSelect(row))
        },
        {
          name:"Party",
          formatter: (_,row) => gridjs.html(partyCheckbox(row)),
          width: "17%"
        },
        {
          name:"",
          formatter: (_,row) => gridjs.html(removeSelections(row)),
          width: "2%"
        }
    ],
    server: {
      url: `https://zjvmukjgrpngjlorkxie.supabase.co/rest/v1/webroutesandpokemon?"Games Title"=eq.${game}&select=*`,
      data: (opts) => {
        return new Promise((resolve, reject) => {
          // let's implement our own HTTP client
          const xhttp = new XMLHttpRequest();
          xhttp.onreadystatechange = function() {
            if (this.readyState === 4) {
              if (this.status === 200) {
                const resp = JSON.parse(this.response);
   
                // make sure the output conforms to StorageResponse format: 
                // https://github.com/grid-js/gridjs/blob/master/src/storage/storage.ts#L21-L24
                resolve({
                  data: mapData(resp)
                });
              } else {
                reject();
              }
            }
          };
          xhttp.open("GET", opts.url, true);
          xhttp.setRequestHeader('apikey',APIKEY);
          xhttp.send();
        });
      }
    },
    width: "100%",
    style: {
        table: {
            'font-size': '15px',
        },
        th:{
            "background": "#333",
            "color": "#CCC",
            'border': 'None',
            'border-bottom': '2px solid #222',
            'text-align': 'center'
        },
        td: {
            'text-align': 'center',
            'background': '#555',
            'color': '#ddd',
            'border': 'none',
            'border-top': '1px solid #222'
        }
      }
  }).render(document.getElementById("table"));

function mapData(data){
  let arr = data.reduce(function (r, a) {
    r[a['Route Name']] = r[a['Route Name']] || [];
    r[a['Route Name']].push(a);
    return r;
  }, Object.create(null));
  let response = [];
  Object.keys(arr).forEach(i => {
    response.push(['', i, arr[i], '', '', '', ''])
  })
  return response;
}


function changeCurrentGame(gameName){
  $("#currentGame").text(gameName);
  game = gameName;
  gridjs.refresh();
}

function getRoutesAndPokemonByGame(game){
  $.ajax({
    url: `https://zjvmukjgrpngjlorkxie.supabase.co/rest/v1/webroutesandpokemon?Game Title=${game}&select=*`,
    headers: {
      'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYyODcyMDgwOSwiZXhwIjoxOTQ0Mjk2ODA5fQ.G5wvnukpD9zTSykhMtodlzpWIz5fGToXUU613DGuF1s'
    },
    success: function(data){
      routes = []
      data.forEach(i => {
        routes.push()
      })
      gridjs.setRowData()
    }
  })
}

$.ajax({
  url: 'https://zjvmukjgrpngjlorkxie.supabase.co/rest/v1/webgames',
  headers: {
    'apikey':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYyODcyMDgwOSwiZXhwIjoxOTQ0Mjk2ODA5fQ.G5wvnukpD9zTSykhMtodlzpWIz5fGToXUU613DGuF1s'
  },
  success: function(data){
    let selector = $('#gameSelector');
    data.forEach(i => {
      let li = $('<li>');
      let a = $(`<a class="dropdown-item" href="#">${i["Game"]}</a>`);
      $(a).on('click', () => changeCurrentGame(i["Game"]));
      li.append(a);
      selector.append(li);
    })
  }
})
