// The main driver of the game
class Engine{
    constructor(){
        this.runner = [];
        this.elements = [];
        this.activeTab = Tabs.PeriodicTable
        console.log("Engine Created...");
    }

    // Starts all the collection processes
    Start(elementContainers){
        this.SetupElements(elementContainers);
        this.SetupButtons();

        console.log("Starting...");
    }

    // Sets up all the buttons
    SetupButtons(){
        $("#PeriodicTable").addClass("active");
        $("#PeriodicTable").click(() => {
            if (this.activeTab === Tabs.PeriodicTable) return;
            this.RemoveActive();
            $("#PeriodicTable").addClass("active");
            this.activeTab = Tabs.PeriodicTable;
            this.ShowPeriodicTable();
            this.HideChemistryLab();
            this.HideTheField();
        });

        $("#ChemLab").click(() => {
            if (this.activeTab === Tabs.ChemistryLab) return;
            this.RemoveActive();
            $("#ChemLab").addClass("active");
            this.activeTab = Tabs.ChemistryLab;
            this.HidePeriodicTable();
            this.ShowChemistryLab();
            this.HideTheField();
        });

        $("#Field").click(() => {
            if (this.activeTab === Tabs.TheField) return;
            this.RemoveActive();
            $("#Field").addClass("active");
            this.activeTab = Tabs.TheField;
            this.HidePeriodicTable();
            this.HideChemistryLab();
            this.ShowTheField();
        });
    }

    // Shows the periodic table tab
    ShowPeriodicTable(){
        $("#ElementContainer").css('display','grid');
    }

    // Hides the periodic table tab
    HidePeriodicTable(){
        $("#ElementContainer").css('display','none');
    }

    // Show the field tab
    ShowTheField(){
        $("#TheField").css('display','grid');
    }

    // Hides the field tab
    HideTheField(){
        $("#TheField").css('display','none');
    }

    // Shows the chemistry tab
    ShowChemistryLab(){
        $("#ChemistryLab").css('display','grid');
    }

    // Hides the chemistry tab
    HideChemistryLab(){
        $("#ChemistryLab").css('display','none');
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
            tempElements.push(
                {
                    Name: $(e).attr("id"),
                    Symbol: $(e).text().trim(),
                    Weight: parseInt($(e).attr("data-weight")),
                    HtmlElement: e,
                    Amount: 0,
                    Hide: () => temp.HideElement(this),
                    Show: () => temp.ShowElement(this)
                }
            )
        });

        tempElements.forEach(e => {
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
                temp.ConfigureElementVisability(e);
            })
        });

        $(tempElements[0].HtmlElement).removeClass("hidden");

        this.elements = tempElements;
        tempElements = [];
    }

    ConfigureElementVisability(element){
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
        return `Weight: ${element.Weight} <br> Description: ${element.Description} <br> Amount: ${element.Amount}`
    }

    // Shows an element
    ShowElement(element){
        $(element).removeClass("hidden");
    }

    // Debug to show all elements
    ShowAllElements(){
        this.elements.forEach(e => {
            e.Show();
        })
    }

    // Hides an element
    HideElement(element){
        $(element).addClass("hidden");
    }

    // Clears any intervals that are running
    ClearIntervals(){
        this.runner.forEach(element => {
            clearInterval(element);
        });

        this.runner = [];
    }
}

class Player{
    constructor(){
    }
}
