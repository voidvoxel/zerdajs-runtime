#!/usr/bin/env node


import readline  from 'readline';
import { parseArgs } from "util";


import { ZerdaRuntime } from "../src/index.mjs";
import { getAbsolutePath, isDirectorySync } from 'pathify';
import path from 'path';
import { readFile } from 'fs/promises';


/**
 * The help text to be displayed whenever the user needs helpful information.
 *
 * @private
 * @since v0.1.0
 * @version 1.0.0
 */
const HELP_TEXT = [
    "Usage:",
    "",
    " <module>    | Run <module>, installing if necessary.",
    "                      | Input is read from `stdin`.",
    "                      | Output is written to `stdout`."
];


/**
 * A table of CLI options.
 *
 * @private
 * @since v0.1.0
 * @version 1.0.0
 */
const PARSE_ARGS_OPTIONS = {
    'clear-cache': {
        type: 'boolean',
        short: 'C',
        default: false
    },
    'help': {
        type: 'boolean',
        short: 'h',
        default: false
    },
    'project': {
        type: 'string',
        short: 'p'
    },
    'usage': {
        type: 'boolean',
        default: false
    },
    'version': {
        type: 'boolean',
        short: 'v',
        default: false
    }
};


/**
 * A list of all valid option names.
 *
 * @private
 * @since v0.1.0
 * @version 1.0.0
 */
const VALID_OPTIONS = [];


// Populate `VALID_OPTIONS`.
for (let optionName in PARSE_ARGS_OPTIONS) {
    VALID_OPTIONS.push(optionName);

    if (PARSE_ARGS_OPTIONS[optionName].short) {
        const shortOptionName = PARSE_ARGS_OPTIONS[optionName].short;

        VALID_OPTIONS.push(shortOptionName);
    }
}


/**
 * Log an error to the console.
 *
 * @private
 * @since v0.1.0
 * @version 1.0.0
 *
 * @param  {...any} lines
 * The message to log.
 */
function error (...lines) {
    console.error("Error:", lines[0]);

    for (
        let i = 1;
        i < lines.length;
        i++
    ) {
        console.error("       " + lines[i]);
    }
}


/**
 * Log an error message and then abort.
 *
 * @private
 * @since v0.1.0
 * @version 1.0.0
 *
 * @param  {...any} lines
 * The error message to log.
 * @returns {never}
 */
function fatal (...lines) {
    error(...lines);

    process.exit(1);
}


/**
 * Log a message to the console.
 *
 * @private
 * @since v0.1.0
 * @version 1.0.0
 *
 * @param  {...any} lines
 * The message to log.
 */
function log (...lines) {
    for (let line of lines) {
        console.log(line);
    }
}


/**
 * Apply a list of plugins to the input.
 * All plugins are applied in the same order as they appear in the list.
 *
 * @private
 * @since v0.3.1
 * @version 2.0.0
 *
 * @param {any[]} input
 * @param  {...any} plugins
 * @returns {any}
 */
async function applyPlugins (
    input,
    ...plugins
) {
    let output = input;

    for (let plugin of plugins) {
        output = await plugin.run(output);
    }

    return output;
}


/**
 * Start the program.
 *
 * @public
 * @since v0.1.0
 * @version 2.0.1
 *
 * @returns {number?}
 */
async function main () {
    let args;

    try {
        args = parseArgs(
            {
                allowPositionals: true,
                args: process.argv.splice(2),
                options: PARSE_ARGS_OPTIONS
            }
        );
    } catch (error) {
        fatal(error.message);
    }

    if (args.length < 1) {
        fatal(...HELP_TEXT);
    }

    const pluginNames = [];

    if (args.values.project) {
        let projectDirectory;
        let projectFile;

        if (isDirectorySync(args.values.project)) {
            projectDirectory = args.values.project;
            projectFile = "zerda.json";
        } else {
            projectDirectory = path.dirname(args.values.project);
            path.basename(args.values.project);
        }

        const projectJSONPath = getAbsolutePath(projectDirectory, projectFile);

        const projectJSON = JSON.parse(
            await readFile(projectJSONPath, "utf8")
        );

        for (let pluginName of projectJSON.plugins) {
            pluginNames.push(pluginName);
        }
    }

    if (args.positionals) {
        pluginNames.push(...args.positionals);
    }

    const shouldClearCache = args.values['clear-cache'];

    if (shouldClearCache) {
        await ZerdaRuntime.clearCache();

        if (pluginNames.length === 0) {
            process.exit();
        }
    }

    const zerdaRuntime = new ZerdaRuntime();

    let plugins = [];

    for (let pluginName of pluginNames) {
        const pluginExports = await zerdaRuntime.require(pluginName);

        plugins.push(pluginExports);
    }

    const lineReader = readline.createInterface(
        {
            input: process.stdin,
            output: process.stdout,
            terminal: false
        }
    );

    lineReader.on(
        'line',
        async inputString => {
            inputString = inputString.trim();

            let input = JSON.parse(inputString);

            if (typeof input[0] === 'undefined') {
                input = [ input ];
            }

            const output = await applyPlugins(
                input,
                ...plugins
            );

            const outputString = JSON.stringify(output);

            console.log(outputString);
        }
    );
}


main();
