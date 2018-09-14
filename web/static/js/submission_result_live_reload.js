window.addEventListener("load", function () {
    let socket = io();

    let $testdump = $("#testdump");

    let job_id = new URL(window.location.href).searchParams.get("id");
    socket.emit('request_submission_updates', { job_id: job_id });

    socket.on("submission_update", function (data) {
        $testdump.append(document.createElement("p").innerHTML = JSON.stringify(data));
    });
});