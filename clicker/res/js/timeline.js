function template(side, title, content, author, created_date){
    return `<div class="section ${side}">
                <div class="content">
                    ${title}
                    ${content}
                    <div class="timeline-footer">
                    <p class="author">${author}</p>
                    <p class="created">${created_date}</p>
                    </div>
                </div>
            </div>`;
}

let timeline = $('.timeline');

$.ajax({
    url: 'https://nqhmfjryvbqzjrjoyrek.supabase.co/rest/v1/timeline_ordered',
    headers: {'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNDg4ODg1NSwiZXhwIjoxOTUwNDY0ODU1fQ.X8YYtJ02Z-jaNelUO0PPSfOWa5ddzYsWr0xOBpCdws4'},
    success: (data) => {
        let side = true;
        data.forEach(d => {
            timeline.append(template(side ? 'right' : 'left', d.title, d.content, d.author, new Date(d.date).toLocaleDateString('en-au',{year: 'numeric', month: 'long', day: 'numeric'})))
            side = !side;
        })
    }
})