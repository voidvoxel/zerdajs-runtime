import readline  from 'readline';


import { Braintime } from "../src/index.mjs";

const braintime = new Braintime();


/**
 * Log an error to the console.
 * @param  {...any} lines
 * The message to log.
 */
function error (...lines) {
    for (let line of lines) {
        console.error(line);
    }
}


/**
 * Log an error message and then abort.
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
 * @param  {...any} lines
 * The message to log.
 */
function log (...lines) {
    for (let line of lines) {
        console.log(line);
    }
}


const HELP_TEXT = [
    "Usage:",
    "",
    "braintime <module>    | Run <module>, installing if necessary.",
    "                      | Input is read from `stdin`.",
    "                      | Output is written to `stdout`."
];


async function main (args) {
    if (args.length < 1) {
        fatal(...HELP_TEXT);
    }

    const modulePath = args[0];

    const braintimeModule = await braintime.evalModule(modulePath);

    const braintimeJSON = structuredClone(braintimeModule.getPackageJSON().braintime);

    const f = await braintimeModule.require();

    const lineReader = readline.createInterface(
        {
            input: process.stdin,
            output: process.stdout,
            terminal: false
        }
    );

    lineReader.on(
        'line',
        (inputString) => {
            const input = JSON.parse(inputString);

            const output = f(...input);

            const outputString = JSON.stringify(output);

            console.log(outputString);
        }
    );
}


const args = process.argv.splice(2);


main(args);
