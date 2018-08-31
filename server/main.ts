import * as ipc from "node-ipc";
import * as net from "net";

function main() {
	ipc.config.id = "ccmaster";
	ipc.config.retry = 5000;

	let cctester_socket: net.Socket | null = null;

	ipc.serve(() => {
		ipc.server.on("cctester.connect", (data, socket) => {
			cctester_socket = socket;
		});
	});

	setInterval(() => {
		if (cctester_socket != null) {
			try {
				ipc.server.emit(cctester_socket, "message", "test");
			} catch (e) {
				console.log("Session ended with other socket");
				cctester_socket = null;
			}
		}
	}, 10 * 1000);

	ipc.server.start();
}


main();
