"use strict";

function main() {
    if (window.FLASH_MESSAGE && window.FLASH_MESSAGE != "undefined" && window.FLASH_MESSAGE != "null") {
        setTimeout(window.alert, 250, window.FLASH_MESSAGE);
    }
}

window.addEventListener("load", main);
