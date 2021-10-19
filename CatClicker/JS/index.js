let Game = {
  catnip: 0,
  CollectCatnip: () => {Game.catnip++}
}

Vue.component('clicker-button', {
  props: {
    name: String,
    text: String
  },
  template: '<button class="clicker-button" Onclick="Game.CollectCatnip()">{{text}}</button>'
});

Vue.component('display',{
  props: {
    title: String,
    item: String
  },
  data: (d) => {
    return {
      item_value: () => Game[d.item]
    }
  },
  template: '<div class="card"><span class="card-title">{{ title }}</span><span>Amount: {{ item_value() }}</span></div>'
});

new Vue({ el: '#instance' });