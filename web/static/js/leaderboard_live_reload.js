window.addEventListener("load", function() {
    let socket = io();

    function renderHeader(problem_num) {
        let output = "";

        output += `<div class="leaderboard-header" style="grid-column: 1 / span 1;">Nickname</div>`;

        let a_char = 'A'.charCodeAt(0);
        for (let j = 0; j < problem_num; j++) {
            output += `<div class="leaderboard-header" style="grid-column: ${j + 2} / span 1;">
                ${String.fromCharCode(a_char + j)}
            </div>`;
        }
        output += `<div class="leaderboard-header" style="grid-column: 17 / span 1;">Total time</div>`;

        return output;
    }

    function renderLeaderboard(mapData) {
        let problem_num = 0;
        for (let _ in mapData[0][1][1]) problem_num++;
        console.log (problem_num);

        let output = "";
        output += renderHeader(problem_num);

        $(".leaderboard-grid").html(output);
    }

    //Setup event listeners
    socket.on("leaderboard_update", function(data) {
        renderLeaderboard(data);
    });

    socket.emit("request_leaderboard_updates", {});
});