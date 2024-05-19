import camelizeKebab from "./camelizeKebab.mjs";


export default function getPluginFunctionName (pluginName) {
    let functionName = pluginName;

    if (pluginName.startsWith('@')) {
        functionName = functionName.split('/')[1];
    }

    functionName = camelizeKebab(functionName);

    return functionName;
}
