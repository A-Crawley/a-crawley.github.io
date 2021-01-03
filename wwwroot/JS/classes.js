// The main driver of the game
class Engine{
    constructor(){
        this.runner = [];
        this.counters = this.GetCounters();
        this.progressBars = this.GetProgressBars();
        this.player = new Player(this.counters, this.progressBars);
        this.buttons = this.GetButtons();
        console.log("Engine Created...");
    }

    // Starts all the collection processes
    Start(){
        console.log("Starting...");

        var calctime = function(base, multi){
            return base / multi;
        }

        this.runner.push(setInterval(() => {
           this.QuarkCollection();
        }, 1000));

        this.runner.push(setInterval(() => {
            this.BosonCollection();
        }, 2000));

        this.runner.push(setInterval(() => {
            this.LeptonCollection()
        }, 2500));

        //clearInterval(this.runner);
    }

    ResetIntervals(){
        this.ClearIntervals()

        var calctime = function(base, multi){
            return base / multi;
        }

        this.runner.push(setInterval(() => {
            this.QuarkCollection();
         }, calctime(1000,this.player.multiplyers.Quarks)));
 
         this.runner.push(setInterval(() => {
             this.BosonCollection();
         }, calctime(2000, this.player.multiplyers.Bosons)));
 
         this.runner.push(setInterval(() => {
             this.LeptonCollection()
         }, calctime(2500, this.player.multiplyers.Leptons)));
    }

    ClearIntervals(){
        this.runner.forEach(element => {
            clearInterval(element);
        });

        this.runner = [];
    }

    // Collects all the counter elements
    GetCounters(){
        var counters = {};

        counters[QuarkName.Up] = $("#UpQuark_Counter");
        counters[QuarkName.Down] = $("#DownQuark_Counter");
        counters[LeptonName.Electron] = $("#Electron_Counter");
        counters[BosonName.Gluon] = $("#Gluon_Counter");

        return counters;
    }

    GetProgressBars(){
        var progressBars = {};

        progressBars[QuarkName.Up] = $("#UpQuark_Progress");
        progressBars[QuarkName.Down] = $("#DownQuark_Progress");
        progressBars[LeptonName.Electron] = $("#Electron_Progress");
        progressBars[BosonName.Gluon] = $("#Gluon_Progress");

        return progressBars;
    }

    // Collects all the button elements
    GetButtons(){
        var buttons = {};

        buttons.Play = $("#Time-Play");
        buttons.Pause = $("#Time-Pause");

        $(buttons.Play.parent()).click(function(){engine.ResetIntervals()});
        $(buttons.Pause.parent()).click(function(){engine.ClearIntervals()})

        return buttons;
    }

    // Specifies how the quarks are collected
    QuarkCollection(){
        this.player.Add(QuarkName.Up, 0.1);
        this.player.Add(QuarkName.Down, 0.1);
    }

    // Specifies how the bosons are collected
    BosonCollection(){
        this.player.Add(BosonName.Gluon, 0.1);
    }

    // Specifies how the leptons are collected
    LeptonCollection(){
        this.player.Add(LeptonName.Electron, 0.1);
    }
}

class Player{
    constructor(counters, progressBars){
        this.counters = counters;
        this.progressBars = progressBars;
        this.particals = {};
        console.log("Player Created...");
        this.multiplyers = {
            Quarks: 1,
            Leptons: 1,
            Bosons: 1
        }
    }

    // Adds a partical to the totals
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

        num = parseFloat(num.toFixed(2));

        if (this.particals[partical] == null || this.particals[partical] == undefined)
            this.particals[partical] = num;
        else
            this.particals[partical] += num;

        this.counters[partical].text(Math.floor(this.particals[partical]));
        
        switch(partical){
            case QuarkName.Up:
            case QuarkName.Down:
            case QuarkName.Strange:
            case QuarkName.Charm:
            case QuarkName.Top:
            case QuarkName.Bottom:
                if (this.multiplyers.Quarks > 30)
                    if (this.progressBars[partical].css("width") !== "100%"){
                        this.progressBars[partical].addClass("progress-bar-striped progress-bar-animated")
                        this.progressBars[partical].css("width","100%");
                        break;
                    }
            default:
                this.progressBars[partical].css("width",`${Math.ceil(this.particals[partical] % 1 * 100)}%`)
                break;
        }
    }
}
