
let pokemons = [];
let pokemonSelector = '';

function fetchPokemon(){
  pokemons.push({id: 1, name: "bulbasaur"});
  pokemons.push({id: 2, name: "Ivysaur"});
  pokemons.push({id: 3, name: "Venusaur"});
}

fetchPokemon();

function formatPokemonSelect(pkmns){
  let html = '<select class="form-select" aria-label="Something" style=\'color:#CCC\'>';
  html += '<option selected>Encounter</option>'
  pkmns.forEach(pkmn => {
    html += `<option value="${pkmn.id}"><div>${pkmn.name}</div></option>`
  })
  html += '</select>'
  pokemonSelector = html;
}

formatPokemonSelect(pokemons);

new gridjs.Grid({
    columns: [
        {name: "Route"}, 
        {
            id:1,
            name: "Encounter",
            formatter: (_) => gridjs.html(pokemonSelector)
        }, 
        {name:"Nickname"},
        {name:"Status"},
        {name:"Party"},
        {name:""}
    ],
    data: [
      ["John", "john@example.com", "(353) 01 222 3333","","",""],
      ["Mark", "mark@gmail.com", "(01) 22 888 4444","","",""],
      ["Eoin", "eoin@gmail.com", "0097 22 654 00033","","",""],
      ["Sarah", "sarahcdd@gmail.com", "+322 876 1233","","",""],
      ["Afshin", "afshin@mail.com", "(353) 22 87 8356","","",""],
    ],
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


setTimeout(function(){
    $('.ui .dropdown')
.dropdown({
    values: [
      {
        name: 'Male',
        value: 'male'
      },
      {
        name     : 'Female',
        value    : 'female',
        selected : true
      }
    ]
  });
}, 2000);
