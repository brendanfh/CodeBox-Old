export function setupAsyncIterators() {
    //Needed in many parts of the application
    (<any>Symbol).asyncIterator = Symbol.asyncIterator || Symbol.for("Symbol.asyncIterator");
}
