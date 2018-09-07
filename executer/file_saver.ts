import * as fs from "fs";
import path from "path";

const genUUID = require("uuid/v4");

export class TempFile {
	private file_name: string;

	public constructor(contents?: string | undefined, extension: string = "tmp") {
		this.file_name = `temp-${genUUID()}.${extension}`;

		if (contents != undefined) {
			this.populateFile(contents);
		}
	}

	public get file_path(): string {
		if (process.env.TEMP_DIR != undefined) {
			return path.join(process.env.TEMP_DIR, this.file_name);
		} else {
			throw new Error("TEMP_DIR NOT SET");
		}
	}

	protected populateFile(contents: string) {
		fs.writeFileSync(this.file_path, contents);
	}

	public deleteFile() {
		try {
			fs.unlinkSync(this.file_path);
		}
		catch { }
	}
}
