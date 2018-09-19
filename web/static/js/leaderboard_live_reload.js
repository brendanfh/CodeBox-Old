window.addEventListener("load", function() {
    let socket = io();

    //Setup event listeners

    socket.emit("request_leaderboard_updates", {});
});