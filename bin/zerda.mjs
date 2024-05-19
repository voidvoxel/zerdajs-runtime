#!/usr/bin/env node


import readline  from 'readline';
import { parseArgs } from "util";


import { ZerdaRuntime } from "../src/index.mjs";
import { getAbsolutePath, isDirectorySync, setFileExtension } from 'pathify';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';


/**
 * A mapping of input files to output files.
 *
 * @private
 * @since v0.1.0
 * @version 1.0.0
 */
const FILE_IO_MAP = [];


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
    'stream': {
        type: 'boolean',
        short: 's',
        default: false
    },
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
    'lines': {
        type: 'boolean',
        short: 'l'
    },
    'project': {
        type: 'string',
        short: 'p'
    },
    'usage': {
        type: 'boolean',
        short: 'u',
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

    let PROJECT_JSON = null;
    let PROJECT_JSON_PATH = null;

    console.debug(args.values)

    // If a project file was provided and flag `--stream` was not passed:
    if (!args.values.stream && args.values.project) {
        let projectDirectory;
        let projectFile;

        if (isDirectorySync(args.values.project)) {
            projectDirectory = args.values.project;
            projectFile = "zerda.json";
        } else {
            projectDirectory = path.resolve(
                path.dirname(args.values.project)
            );

            projectFile = path.basename(args.values.project);
        }

        // Get the path to the project file.
        const PROJECT_JSON_PATH = getAbsolutePath(projectDirectory, projectFile);

        // Load the project file.
        PROJECT_JSON = JSON.parse(
            await readFile(PROJECT_JSON_PATH, "utf8")
        );

        // Add all plugins from the project file.
        for (let pluginName of PROJECT_JSON.plugins) {
            pluginNames.push(pluginName);
        }

        // Add all input files from the project file.
        for (let inputPattern in PROJECT_JSON.files) {
            // Get a list of input files that match the input file pattern.
            const inputPaths = await glob(
                path.join(projectDirectory, inputPattern)
            );

            // For each input file that matches the input pattern:
            for (const inputPath of inputPaths) {
                // Get the output path.
                const outputPath = setFileExtension(
                    inputPath,
                    PROJECT_JSON.files[inputPattern]
                );

                // Add this key-value pair to the file IO map.
                FILE_IO_MAP[inputPath] = outputPath;
            }
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

    const PROJECT_FILE_PATH = Object.keys(FILE_IO_MAP).length >= 1;

    if (PROJECT_FILE_PATH) {
        /* Project file; read project file and process all IO. */

        for (let inputPath in FILE_IO_MAP) {
            // Read the input file.
            let inputFileString = await readFile(
                inputPath,
                "utf-8"
            );

            // Set the output file to an empty string.
            let outputFileString = "";

            // If line-by-line parsing is enabled:
            if (args.values.lines || PROJECT_JSON.lines) {
                // For each line of the input file:
                for (let inputString of inputFileString.split("\n")) {
                    // Trim the line.
                    inputString = inputString.trim();

                    // If the line is empty, return.
                    if (inputString === "") {
                        continue;
                    }

                    // Parse the line as a JSON array.
                    let input;

                    try {
                        input = JSON.parse(inputString);
                    } catch {
                        input = inputString;
                    }

                    // If this is a single object, add it to an array.
                    if (typeof input[0] === 'undefined') {
                        input = [ input ];
                    }

                    // Process the input through each plugin.
                    const output = await applyPlugins(
                        input,
                        ...plugins
                    );

                    // Get the output line.
                    const outputString = JSON.stringify(output);

                    // Add the output line to the string.
                    outputFileString += outputString + "\n";
                }
            } else {
                // Read the input file.
                let inputString = await readFile(
                    inputPath,
                    "utf-8"
                );

                // Trim the line.
                inputString = inputString.trim();

                // If the line is empty, return.
                if (inputString === "") {
                    continue;
                }

                // Parse the line as a JSON array.
                let input;

                try {
                    input = JSON.parse(inputString);
                } catch {
                    input = inputString;
                }

                // If this is a single object, add it to an array.
                if (typeof input[0] === 'undefined') {
                    input = [ input ];
                }

                // Process the input through each plugin.
                const output = await applyPlugins(
                    input,
                    ...plugins
                );

                // Get the output line.
                const outputString = JSON.stringify(output);

                // Add the output line to the string.
                outputFileString += outputString + "\n";
            }

            const outputPath = FILE_IO_MAP[inputPath];

            await writeFile(
                outputPath,
                outputFileString,
                "utf-8"
            );
        }
    } else {
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

                let input;

                try {
                    input = JSON.parse(inputString);
                } catch {
                    input = inputString;
                }

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

    if (PROJECT_FILE_PATH) {
        process.exit();
    }
}


main();
