// The main driver of the game
class Engine{
    constructor(){
        this.runner = [];
        this.elements = [];
        this.activeTab = Tabs.PeriodicTable;
        this.settings = {
            Debug: false
        };
        this.machines = [];
        this.money = 0.00;
        console.log("Engine Created...");
    }

    // Starts all the collection processes
    Start(elementContainers){
        this.SetupElements(elementContainers);
        this.setUpPopOvers();
        this.SetUpMachines();
        this.SetupButtons();
        this.SetupUnlocks();
        this.AutoSave();

        console.log("Starting...");
    }

    Resume(saveData){
        var temp = this;
        var saveData = JSON.parse(saveData);

        this.elements = saveData.Elements;
        this.settings = saveData.Settings;
        this.money = saveData.Money;
        this.machines = saveData.Machines;

        this.elements.forEach(e => {
            e["Hide"] = () => temp.HideElement(e);
            e["Show"] = () => temp.ShowElement(e);
        })

        this.elements.forEach(e => {
            if (!e.Hidden)
                e.Show();
        })

        this.setUpPopOvers();
        this.SetUpMachines();
        this.SetupButtons();
        this.AddMoney(0);
        this.SetupUnlocks();
        this.AutoSave();

        console.log("Resuming...");
    }

    AddMoney(amount){
        this.money += parseFloat(amount);
        $("#Money").text(this.money.toFixed(2))
    }

    TakeMoney(amount){
        this.money -= parseFloat(amount);
        $("#Money").text(this.money.toFixed(2))
    }

    SetupUnlocks(){
        var temp = this;

        $.each($("#Drills").find('button'), function(i,e){
            if (!$(e).attr('class').includes('unlock')) return;
            var price = $($(e).find('a')[0]).attr('data-unlock-price');
            $($(e).find('a')[0]).text(parseFloat(price).toFixed(2));
            $(e).click(() => {
                if (temp.money < parseFloat(price)) return;
                temp.TakeMoney(price);
                $(e).css("display","none");
                temp.ButtonAction($($(e).find('a')[0]).attr('data-action'))
            })
        })
    }

    ButtonAction(string){
        var arr = string.split("|");
        var action = arr[0];

        switch(action){
            case "unlock":
                this.UnlockAction(arr[1], arr[2]);
                break;
            default:
                break;
        }
    }

    UnlockAction(itemType, item){
        switch(itemType){
            case "element":
                this.ConfigureElementVisibility(item, true);
                break;
            default:
                break;
        }
    }

    // Sets up all the buttons
    SetupButtons(){
        var temp = this;

        $("#PeriodicTable").addClass("active");
        $("#PeriodicTable").click(() => {
            if (this.activeTab === Tabs.PeriodicTable) return;
            this.RemoveActive();
            $("#PeriodicTable").addClass("active");
            this.activeTab = Tabs.PeriodicTable;
            this.HideTabs();
            this.ShowTab("#ElementContainer");
        });

        $("#ChemLab").click(() => {
            if (this.activeTab === Tabs.ChemistryLab) return;
            this.RemoveActive();
            $("#ChemLab").addClass("active");
            this.activeTab = Tabs.ChemistryLab;
            this.HideTabs();
            this.ShowTab("#ChemistryLab");
        });

        $("#Field").click(() => {
            if (this.activeTab === Tabs.TheField) return;
            this.RemoveActive();
            $("#Field").addClass("active");
            this.activeTab = Tabs.TheField;
            this.HideTabs();
            this.ShowTab("#TheField");
        });

        $("#MarketButton").click(() => {
            if (this.activeTab === Tabs.TheField) return;
            this.RemoveActive();
            $("#MarketButton").addClass("active");
            this.activeTab = Tabs.TheField;
            this.HideTabs();
            this.ShowTab("#MarketPlace");
        });

        $("#SettingsButton").click(() => {
            if (this.activeTab === Tabs.Settings) return;
            this.RemoveActive();
            $("#SettingsButton").addClass("active");
            this.activeTab = Tabs.Settings;
            this.HideTabs();
            this.ShowTab("#Settings");
        });

        $("#Reset").click(() => {
            this.Restart();
        })

        $("#ExportButton").click(() => {
            $("#ExportTextinput").val(this.Export());
        });

        $("#ImportButton").click(() => {
            var text = $("#ImportTextinput").val();
            
            switch(text){
                case "debug":
                    console.log("Oooh...");
                    console.log("Someone knows their stuff...");
                    this.settings.Debug = true;
                    break;
                default:
                    this.Import(text);
                    break;
            }

            $("#ImportTextinput").val("")
        });

        $("#MarketButton").click(() => {
            if (this.activeTab === Tabs.MarketPlace) return;
            this.RemoveActive();
            $("#MarketButton").addClass("active");
            this.activeTab = Tabs.MarketPlace;
            this.HideTabs();
            this.ShowTab("#MarketPlace");
        })
        
        $.each($("#MarketPlace").find("button"), function(i,e){
            if (!$(e).attr('class').includes('sell')) return;

            $(e).click(() => {
                var element = temp.elements.filter(el => el.Symbol === $(e).attr("data-sell-element"))[0];
                var sellAmount = $(e).attr("data-sell-amount");
                if (sellAmount === "max") {
                    temp.AddMoney(parseInt(element.Amount) * parseFloat(element.SellPrice));
                    $(element).trigger("amount-decrease", element.Amount, false); 
                    return;
                }
                if (element < parseInt(sellAmount)) return;
                $(element).trigger("amount-decrease", $(e).attr("data-sell-amount"), false);
                temp.AddMoney(parseInt(sellAmount) * parseFloat(element.SellPrice));
            })
        })

        $.each($("#Machines").find(".machine"), function(i,e){
            let id = $(e).attr("id");

            let unlock = $(`#${id}`).find(".unlock-btn")[0];

            $(unlock).click(() => temp.UnlockMachine(id));

            $.each($(e).find(".remove"), function(i,e){
                if ($(e).attr("data-remove-max") == "true"){
                    $(e).click(() => temp.RemoveMachineMax(id));
                    return;
                }

                var amount = $(e).attr("data-remove-amount");
                $(e).click(() => temp.RemoveMachine(id,amount));
            });

            $.each($(e).find(".add"), function(i,e){
                if ($(e).attr("data-add-max") == "true"){
                    $(e).click(() => temp.AddMachineMax(id));
                    return;
                }

                var amount = $(e).attr("data-add-amount");
                $(e).click(() => temp.AddMachine(id,amount));
            });
        });
    }

    SetUpMachines(){
        var temp = this;
        this.machines.forEach(machine => {
            temp.UnlockMachine(machine.id);
            temp.SetMachineCount(machine.id, machine.count);
        });
    }

    SetMachineCount(id, count){
        var element = $(`#${id}`);
        var countElement = $(element.find(".machine-count")[0]).find("span");
        $(countElement).text(count);
    }

    UnlockMachine(id){
        if (this.machines == null || this.machines.length == 0 || !this.machines.filter(m => m.id == id)){
            var machine = {
                id: id,
                count: 0
            };
            this.machines.push(machine);

            this.AddMachine(id, 1);
        }

        var element = $(`#${id}`);
        $(element.find(".unlock-btn")).css({"display": "none"});
        $(element.find(".machine-remove")).css({"display": "block"})
        $(element.find(".machine-count")).css({"display": "block"})
        $(element.find(".machine-add")).css({"display": "block"})
    }

    RemoveMachine(id,amount){
        var oldAmount = this.machines.filter(m => m.id == id)[0].count;

        if (oldAmount - amount < 0){
            this.machines = this.machines.map(m => m.id == id ? {...m, count: 0} : m);
        }
        else{
            this.machines = this.machines.map(m => m.id == id ? {...m, count: m.count - parseInt(amount)} : m);
        }
        var newAmount = this.machines.filter(m => m.id == id)[0].count;
        console.log(newAmount);
        this.SetMachineCount(id, newAmount);
        console.log(`Remove ${amount} ${id}'s`)
    }

    AddMachine(id,amount){
        this.machines = this.machines.map(m => m.id == id ? {...m, count: m.count + parseInt(amount)} : m);
        var newAmount = this.machines.filter(m => m.id == id)[0].count;
        console.log(newAmount);
        this.SetMachineCount(id, newAmount);
        console.log(`Add ${amount} ${id}'s`)
    }

    RemoveMachineMax(id){
        console.log(`Remove all ${id}'s`)
    }

    AddMachineMax(id){
        console.log(`Add all ${id}'s`)
    }

    ShowTab(id){
        $(id).css('display','grid');
    }

    // Hides the periodic table tab
    HideTabs(){
        $("#ElementContainer").css('display','none');
        $("#TheField").css('display','none');
        $("#ChemistryLab").css('display','none');
        $("#Settings").css('display','none');
        $("#MarketPlace").css('display','none');
    }

    // Removes active flag from buttons
    RemoveActive(){
        $.each($("#GameTabs").children(),function(i, e) {
            $(e).removeClass("active");
        })
    }

    // Sets up all the html elements
    SetupElements(elementContainers){
        var tempElements = [];
        var temp = this;

        $.each(elementContainers, function(i,e){
            var element = {
                Name: $(e).attr("id"),
                Symbol: $(e).text().trim().replace("#","").replace(":",""),
                Weight: parseInt($(e).attr("data-atomic-number")),
                Description: $(e).attr("data-description"),
                HtmlElement: `#${$(e).attr("id")}`,
                Amount: 0,
                SellPrice: 1,
                Hidden: true
            };

            element["Hide"] = () => temp.HideElement(element);
            element["Show"] = () => temp.ShowElement(element);
            
            tempElements.push(element)
        });
        
        this.elements = tempElements;
    }

    setUpPopOvers(){
        var temp = this;
        this.elements.forEach(e => {
            $(e.HtmlElement).attr("data-toggle","popover");
            $(e.HtmlElement).attr("data-html","true");
            $(e.HtmlElement).attr("Title",e.Name);
            $(e.HtmlElement).attr("data-placement","right");
            $(e.HtmlElement).attr("data-content",this.Content(e));

            $(`#${e.Name}Amount`).text(e.Amount);

            $(e).on('amount-increase', function(event,amount){
                e.Amount += parseInt(amount);
                $(`#${e.Name}Amount`).text(e.Amount);
                $(e.HtmlElement).attr('data-content',temp.Content(e));
                $(e.HtmlElement).popover('show');
            })

            $(e).on('amount-decrease', function(event,amount, showPopover){
                e.Amount -= parseInt(amount);
                $(`#${e.Name}Amount`).text(e.Amount);
                $(e.HtmlElement).attr('data-content',temp.Content(e));
                if (showPopover)
                    $(e.HtmlElement).popover('show');
            })
            
            
            $($(e.HtmlElement).children()[0]).click(function() {
                $(e).trigger('amount-increase', 1, true);
            })
        });

        this.elements[0].Show();

    }

    ConfigureElementVisibility(symbol, show){
        var element = this.elements.filter(e => e.Symbol === symbol)[0];

        if (show){
            this.ShowElement(element);
            return;
        }

        this.HideElement(element);
    }

    // Standardizes the content in the popovers
    Content(element){
        return `<b>Atomic Number:</b> ${element.Weight} <br> <b>Description:</b> ${element.Description} <br> <b>Amount:</b> ${element.Amount}`
    }

    // Shows an element
    ShowElement(element){
        $(element.HtmlElement).removeClass("hidden");
        element.Hidden = false;
    }

    // Debug to show all elements
    ShowAllElements(){
        this.elements.forEach(e => {
            e.Show();
        })
    }

    // Hides an element
    HideElement(element){
        $(element.HtmlElement).addClass("hidden");
        element.Hidden = true;
    }

    // Clears any intervals that are running
    ClearIntervals(){
        this.runner.forEach(element => {
            clearInterval(element);
        });

        this.runner = [];
    }

    AutoSave(){
        this.runner.push(setInterval(() => {
            this.Save();
        },1000))
    }

    Export(){
        var saveData = {
            Elements: this.elements,
            Settings: this.settings,
            Money: this.money
        };

        return btoa(JSON.stringify(saveData));
    }

    Import(base64){
        localStorage.setItem('gameSaveData', atob(base64));
        location.reload();
    }

    Save(){
        var saveData = {
            Elements: this.elements,
            Settings: this.settings,
            Money: this.money,
            Machines: this.machines
        };

        localStorage.setItem('gameSaveData',JSON.stringify(saveData));
    }

    Restart(){
        localStorage.removeItem('gameSaveData');
        location.reload();
    }

    Load(){
        return localStorage.getItem('gameSaveData');        
    }
}

class Player{
    constructor(){
    }
}
