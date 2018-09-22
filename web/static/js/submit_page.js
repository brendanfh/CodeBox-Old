window.addEventListener("load", function () {
    let state = false;

    $(".switch-btn").on("click", function (evt) {
        if (state) {
            $("#upload-file-btn").show();
            $("#text-editor").hide();

            $(".switch-btn span").html("Switch to editor");
        } else {
            $("#upload-file-btn").hide();
            $("#text-editor").show();

            $(".switch-btn span").html("Switch to file upload");
        }

        state = !state;
    });
});