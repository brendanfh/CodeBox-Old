export interface IExecuter {
	execute(path: string, inputFile: string): Promise<string>;
}
