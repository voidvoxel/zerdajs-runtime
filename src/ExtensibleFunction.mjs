export default class ExtensibleFunction extends Function {
    constructor (f) {
        return Object.setPrototypeOf(
            f,
            new.target.prototype
        );
    }
}
