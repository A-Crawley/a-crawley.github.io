// The main driver of the game
class Engine{
    constructor(){
        this.runner = null;
        this.counters = this.GetCounters();
        this.player = new Player(this.counters);
        this.buttons = this.GetButtons();
        console.log("Engine Created...");
    }

    Start(){
        console.log("Starting...");
        //this.runner = setInterval(() => {
        //    this.Process();
        //}, 1000);
        //clearInterval(this.runner);
    }

    GetCounters(){
        var counters = {};

        counters[QuarkName.Up] = $("#UpQuark_Counter");
        counters[QuarkName.Down] = $("#DownQuark_Counter");
        counters[LeptonName.Electron] = $("#Electron_Counter");
        counters[BosonName.Gluon] = $("#Gluon_Counter");

        return counters;
    }

    GetButtons(){
        var buttons = {};

        buttons["String"] = $("#String_Action");

        buttons["String"].click(() => {this.player.BreakString()});

        return buttons;
    }

    Process(){
        console.log('Running...');
        this.player.Add(QuarkName.Up, 1);
    }
}

class Player{
    constructor(counters){
        this.counters = counters;
        this.particals = {};
        console.log("Player Created...");
    }

    BreakString(){
        this.Add(QuarkName.Up, 1);
        this.Add(QuarkName.Down, 1);
        this.Add(LeptonName.Electron, 1);
        this.Add(BosonName.Gluon, 1);
    }

    Add(partical, num){
        switch(partical){
            case QuarkName.Up:
            case QuarkName.Down:
            case QuarkName.Strange:
            case QuarkName.Charm:
            case QuarkName.Top:
            case QuarkName.Bottom:
            case LeptonName.Electron:
            case BosonName.Gluon:
                this.PrivateAdd(partical, num);
                break;
            default:
                break;
        }
    }

    PrivateAdd(partical, num){
        if (this.particals[partical] == null || this.particals[partical] == undefined)
            this.particals[partical] = num;
        else
            this.particals[partical] += num;

        this.counters[partical].text(this.particals[partical]);
    }
}
