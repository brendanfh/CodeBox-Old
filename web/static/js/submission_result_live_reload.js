window.addEventListener("load", function () {
    let socket = io();

    let $resultStatus = $(".result-status");
    let $resultStatusList = $(".result-test-case-list");
    let $resultProgressBar = $(".result-progress-bar");
    let $resultProgressBarOutline = $(".result-progress-bar-outline");

    let job_id = new URL(window.location.href).searchParams.get("id");

    function renderStatusList(status) {
        if (status.kind == "STARTED" || status.kind == "COMPILING" || status.kind == "COMPILE_ERR") {
            return "";
        }

        let output = "";
        for (let i = 0; i < status.total; i++) {
            let testCond = "pending";
            let testMessage = "Not Started";

            if (i < status.completed) {
                testCond = "good";
                testMessage = "Correct!";
            }

            if (status.kind != "COMPLETED" && status.kind != "RUNNING") {
                if (i == status.completed) {
                    testCond = "bad";
                    if (status.kind == "WRONG_ANSWER") {
                        testMessage = "Wrong Answer";
                    } else if (status.kind == "TIME_LIMIT_EXCEEDED") {
                        testMessage = "Time Limit Exceeded";
                    } else if (status.kind == "BAD_EXECUTION") {
                        testMessage = "Run Time Error";
                    }
                }
            }

            if (status.kind == "RUNNING") {
                if (i == status.completed) {
                    testMessage = "Running";
                }
            }

            output += `
                <div class="result-test-case ${i % 2 == 0 ? 'alternate-color' : ''}">
                    <div class="result-test-case-state side-status ${testCond}-status"></div>
                    <div class="result-test-case-name">Test ${i + 1}</div>
                    <div class="result-test-case-message">${testMessage}</div>
                    <div class="result-test-case-runtime">
                        ${(i + 1 <= status.completed && (status.run_times[i] / 1000000).toFixed(3)) || '-.---'}s
                    </div>
                </div>`;
        }

        return output;
    }

    function renderResubmitButton() {
        return `
            <a href="/problems/${window.PROBLEM_ID}/submit"><div class="resubmit-button">Submit again</div></a>
            <a href="/problems/${window.PROBLEM_ID}"><div class="resubmit-button">Back to problem</div></a>
        `;
    }

    function renderStatus(status) {
        $resultProgressBarOutline.removeClass("completed");
        $resultProgressBarOutline.removeClass("error");
        $resultStatusList.html(renderStatusList(status));

        switch (status.kind) {
            case "STARTED": {
                $resultStatus.html("Starting...");
                $resultProgressBar.css({ width: "0%" })
                break;
            }

            case "COMPILING": {
                $resultStatus.html("Compiling...");
                $resultProgressBar.css({ width: "20%" })
                break;
            }

            case "COMPILE_ERR": {
                $resultStatus.html("Compile Error\n" + renderResubmitButton());
                $resultProgressBar.css({ width: "20%" });
                $resultProgressBarOutline.addClass("error");

                $('.result-compile-error').removeClass('hidden');
                $('.result-compile-error pre').html(status.err_msg);
                break;
            }

            case "RUNNING": {
                $resultStatus.html(`Running test ${status.completed + 1} out of ${status.total} `);
                $resultProgressBar.css({ width: `${40 + 60 * (status.completed / status.total)}% ` });
                break;
            }

            case "COMPLETED": {
                if (status.total == 0) {
                    $resultStatus.html(`Correct answer!`);
                } else {
                    $resultStatus.html(`Completed successfully`);
                }
                $resultProgressBar.css({ width: "100%" });
                $resultProgressBarOutline.addClass("completed");
                break;
            }

            case "WRONG_ANSWER": {
                if (status.total == 0) {
                    $resultStatus.html(`Wrong answer`);
                } else {
                    $resultStatus.html(`Wrong answer on test case ${status.completed + 1} out of ${status.total}\n` + renderResubmitButton());
                }
                $resultProgressBar.css({ width: `${40 + 60 * (status.completed / status.total)}% ` });
                $resultProgressBarOutline.addClass("error");
                break;
            }

            case "TIME_LIMIT_EXCEEDED": {
                $resultStatus.html(`Time limit exceeded on test case ${status.completed + 1} out of ${status.total} ` + renderResubmitButton());
                $resultProgressBar.css({ width: `${40 + 60 * (status.completed / status.total)}% ` });
                $resultProgressBarOutline.addClass("error");
                break;
            }

            case "BAD_EXECUTION": {
                $resultStatus.html(`Run time error on test case ${status.completed + 1} out of ${status.total} ` + renderResubmitButton());
                $resultProgressBar.css({ width: `${40 + 60 * (status.completed / status.total)}% ` });
                $resultProgressBarOutline.addClass("error");
                break;
            }
        }
    }

    socket.emit('request_submission_updates', { job_id: job_id });

    socket.on("submission_update", function (status) {
        renderStatus(status);
    });
});