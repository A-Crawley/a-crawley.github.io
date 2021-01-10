// The main driver of the game
class Engine{
    constructor(){
        this.runner = [];
        this.elements = [];
        this.activeTab = Tabs.PeriodicTable;
        this.settings = {
            Debug: false
        };
        console.log("Engine Created...");
    }

    // Starts all the collection processes
    Start(elementContainers){
        this.SetupElements(elementContainers);
        this.setUpPopOvers();
        this.SetupButtons();
        this.AutoSave();

        console.log("Starting...");
    }

    Resume(saveData){
        var temp = this;
        var saveData = JSON.parse(saveData);

        this.elements = saveData.Elements;
        this.settings = saveData.Settings;

        this.elements.forEach(e => {
            e["Hide"] = () => temp.HideElement(e);
            e["Show"] = () => temp.ShowElement(e);
        })

        this.elements.forEach(e => {
            if (!e.Hidden)
                e.Show();
        })

        this.setUpPopOvers();
        this.SetupButtons();
        this.AutoSave();

        console.log("Resuming...");
    }

    // Sets up all the buttons
    SetupButtons(){
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

            $($(e.HtmlElement).children()[0]).click(function() {
                e.Amount++;
                $(`#${e.Name}Amount`).text(e.Amount);
                $(e.HtmlElement).attr('data-content',temp.Content(e));
                $(e.HtmlElement).popover('show');
                temp.ConfigureElementVisibility(e);
            })
        });

        this.elements[0].Show();

    }

    ConfigureElementVisibility(element){
        switch(element.Weight){
            case 1:
                if (element.Amount === 10)
                    this.elements[1].Show();
                break;
            default:
                break;
        }

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
            Settings: this.settings
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
            Settings: this.settings
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
