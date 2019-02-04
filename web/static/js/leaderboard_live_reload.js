window.addEventListener("load", function () {
    let socket = io();

    function renderTimebar(start_time, end_time) {
        let output = "";


        output += `<div class="leaderboard-time-container">
            <div class="leaderboard-time-remaining"></div>
            <div class="left" style="padding-left: 12px">${new Date(start_time).toLocaleTimeString()} on ${new Date(start_time).toLocaleDateString()}</div>
            <div class="right" style="padding-right: 12px">${new Date(end_time).toLocaleTimeString()} on ${new Date(end_time).toLocaleDateString()}</div>
            <div class="leaderboard-time-progress-outline">
                <div class="leaderboard-time-progress"></div>
            </div>
        </div>`;

        return output;
    }

    function renderHeader(problem_num, problem_map) {
        let output = "";

        output += `<div class="leaderboard-header" style="grid-column: 1 / span 1;">Place</div>`;
        output += `<div class="leaderboard-header" style="grid-column: 2 / span 1;">Nickname</div>`;

        let a_char = 'A'.charCodeAt(0);
        for (let j = 0; j < problem_num; j++) {
            let char = String.fromCharCode(a_char + j);
            output += `<div class="leaderboard-header" style="grid-column: ${j + 3} / span 1;">
                <a href="/problems/${problem_map[char]}">${char}</a>
            </div>`;
        }
        output += `<div class="leaderboard-header" style="grid-column: ${problem_num + 3} / span 1;">Score</div>`;

        return output;
    }

    let userindex = -1;
    function renderUsernames(usernames, nickname_map) {
        let output = "";
        let i = 0;
        for (let user of usernames) {
            if (nickname_map[user] == window.LEADERBOARD_NICKNAME) {
                userindex = i;
            }

            output += `<div class="leaderboard-username ${i % 2 == 1 ? "alternate-color" : ""} ${i == userindex ? 'highlighted' : ''}">${nickname_map[user]}</div>`;
            i++;
        }

        return output;
    }

    function renderPlaceNumbers(usernames) {
        let output = "";
        let i = 1;
        for (let _ of usernames) {
            output +=
                `<div class="leaderboard-place-number ${(i - 1) % 2 == 1 ? "alternate-color" : ""} ${i - 1 == userindex ? 'highlighted' : ''}"
                    style="grid-row: ${i + 1} / span 1;">
                    ${i}
                </div>`
            i++;
        }

        return output;
    }

    function renderSubmissions(scoreData) {
        let output = "";

        let i = 2;
        for (let user of scoreData.values()) {
            let j = 3;
            for (let letter in user[1]) {
                let res = user[1][letter];
                if (!res[2]) continue;
                let end_state = res[0];

                let color_class = "";
                if (end_state == "CORRECT") color_class = "good";
                if (end_state == "WRONG") color_class = "bad";

                output += `
                    <div class="leaderboard-submission ${(i % 2 == 1 ? 'alternate-color' : '')} ${i - 2 == userindex ? 'highlighted' : ''} ${color_class}"
                        style="grid-column: ${j} / span 1; grid-row: ${i} / span 1;">
                        ${res[1]}
                    </div>`;

                j++;
            }
            i++;
        }

        return output;
    }

    function renderScores(scoreData, problem_num) {
        let output = "";

        let i = 2;
        for (let user of scoreData.values()) {
            let score = Math.floor(user[0]);

            output += `
                <div class="leaderboard-time ${(i % 2 == 1 ? 'alternate-color' : '')} ${i - 2 == userindex ? 'highlighted' : ''}"
                    style="grid-column: ${problem_num + 3} / span 1; grid-row: ${i} / span 1;">
                    ${score}
                </div>`;

            i++;
        }

        return output;
    }

    let start_time = 0;
    let end_time = 0;

    function renderLeaderboard(data) {
        let nickname_map = data.nickname_map;
        let problem_map = data.problem_map;
        let mapData = data.scores;

        let problem_num = 0;
        for (let _ in problem_map) problem_num++;

        let scoreData = new Map(mapData);

        userindex = -1;
        start_time = data.start_time;
        end_time = data.end_time;

        let output = "";

        output += renderTimebar(data.start_time, data.end_time);

        output += `
            <div class="leaderboard-grid"
                style="
                    grid-template-columns: 100px minmax(200px, 800px) repeat(${problem_num}, 64px) minmax(100px, 300px);
                    grid-template-rows: 64px repeat(auto-fill, 48px);
                ">`;

        output += renderHeader(problem_num, problem_map);
        output += renderUsernames(scoreData.keys(), nickname_map);
        output += renderPlaceNumbers(scoreData.keys());
        output += renderSubmissions(scoreData);
        output += renderScores(scoreData, problem_num);

        output += "</div>";

        $(".leaderboard").html(output);
    }

    function updateTimebar() {
        let curr_time = Date.now();
        let time = curr_time - start_time;

        let duration = end_time - start_time;
        let complete = time / duration;
        if (complete > 1) complete = 1;

        time = end_time - curr_time;
        if (time > duration)
            time = duration;

        if (time < 0)
            time = 0;

        let hours = time / (1000 * 60 * 60);
        let minutes = (hours - Math.floor(hours)) * 60;
        let seconds = Math.floor((minutes - Math.floor(minutes)) * 60);
        minutes = Math.floor(minutes);
        hours = Math.floor(hours);

        let disp_hours = hours.toFixed(0).padStart(2, '0');
        let disp_minutes = minutes.toFixed(0).padStart(2, '0');
        let disp_seconds = seconds.toFixed(0).padStart(2, '0');

        $(".leaderboard-time-remaining").html(`${disp_hours}:${disp_minutes}:${disp_seconds}`);
        $(".leaderboard-time-progress").css({ width: `${complete * 100}%` });
    }

    //Setup event listeners
    socket.on("leaderboard_update", function (data) {
        renderLeaderboard(data);
        updateTimebar();
    });

    setInterval(updateTimebar, 1000);

    socket.emit("request_leaderboard_updates", {});
});