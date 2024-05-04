import { fork } from 'child_process';


import { PluginManager } from 'live-plugin-manager';
import { PackageJSON } from '@voidvoxel/package-json';
import path from 'path';


export class Braintime {
    /**
     * @type {string}
     */
    #cwd

    /**
     * @type {string}
     */
    #nodeModulesPath

    /**
     * @type {PluginManager}
     */
    #npm


    constructor (
        options = {}
    ) {
        this.#cwd = options.cwd ?? process.cwd();
        this.#nodeModulesPath = options.nodeModulesPath ?? 'node_modules';
    }


    async evalFile (
        modulePath,
        forkOptions = {}
    ) {
        await this.#initialize();

        console.log('main:', modulePath);

        const subprocess = fork(
            modulePath,
            forkOptions ?? {}
        );

        const exitCode = await new Promise(
            (resolve) => {
                subprocess.on(
                    'exit',
                    resolve
                );
            }
        );

        if (exitCode !== 0) {
            throw new Error(`The script returned with error code ${exitCode}`);
        }

        return exitCode === 0 ? null : exitCode;
    }


    async evalModule (
        modulePath,
        forkOptions = {}
    ) {
        // Initialize the runtime environment.
        await this.#initialize();

        // Load the `PackageJSON`.
        const packageJSON = await PackageJSON.readFile(modulePath);

        // Evaluate the main file of the module.
        await this.evalFile(
            path.resolve(
                path.join(
                    modulePath,
                    packageJSON.main
                )
            ),
            forkOptions ?? {}
        );
    }


    async #initialize () {
        // If this has already been initialized, return.
        if (this.#npm) {
            return;
        }

        // Create a new `PluginManager` to manage modules.
        this.#npm = new PluginManager(
            {
                cwd: this.#cwd,
                pluginsPath: this.#nodeModulesPath
            }
        );

        // Install all built-in dependencies.
        await this.#installBrainJS();
    }


    async #installBrainJS () {
        await this.#npm.install(
            'brain.js',
            '^2.0.0-beta.23'
        );
    }
}
