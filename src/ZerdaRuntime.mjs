import { fork } from 'child_process';
import { tmpdir } from 'os';
import path from 'path';


import { PluginManager } from 'live-plugin-manager';
import { ZerdaRuntimeModule } from './ZerdaRuntimeModule.mjs';


const BRAINTIME_TMP_DIR = path.resolve(
    path.join(
        tmpdir(),
        "zerdaRuntime"
    )
);


export class ZerdaRuntime {
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


    static async clearCache () {
        await rm(
            BRAINTIME_TMP_DIR,
            {
                force: true,
                recursive: true
            }
        );

        await mkdir(
            BRAINTIME_TMP_DIR,
            {
                recursive: true
            }
        );
    }


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


    async evalModule (modulePath) {
        // Initialize the runtime environment.
        await this.#initialize();

        // Resolve the module path.
        modulePath = path.resolve(modulePath);

        // Require the module.
        return await this.require(modulePath);
    }


    async require (moduleName) {
        const zerdaRuntimeModule = new ZerdaRuntimeModule(moduleName);

        await zerdaRuntimeModule.require();

        return zerdaRuntimeModule;
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
                pluginsPath: path.resolve(
                    path.join(
                        this.#cwd,
                        this.#nodeModulesPath
                    )
                )
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
