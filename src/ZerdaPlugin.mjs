import ExtensibleFunction from "./ExtensibleFunction.mjs";
import getPluginFunctionName from "./functions/getPluginFunctionName.mjs";


/**
 * A plugin for the Zerda runtime environment.
 */
export default class ZerdaPlugin extends ExtensibleFunction {
    /**
     * The name of the plugin.
     *
     * @private
     * @version 1.0.0
     *
     * @type {string}
     */
    _name

    /**
     * The callback to pass input data through.
     *
     * @private
     * @version 1.0.0
     *
     * @type {function}
     */
    _run


    constructor (
        pluginExports,
        options = {}
    ) {
        super(pluginExports.run);

        const pluginName = options.name ?? "anonymous";

        this._name = pluginName ?? "";

        Object.defineProperty(
            this,
            "name",
            {
                value: getPluginFunctionName(this._name),
                writable: false
            }
        );

        this._run = pluginExports.run;
    }


    getName () {
        return this._name;
    }


    run (input) {
        return this._run(input);
    }
}
