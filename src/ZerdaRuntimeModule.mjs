import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";


import { globSync } from "glob";
import { JavaScriptInjector } from "javascript-injector";
import { PluginManager } from "live-plugin-manager";
import { PackageJSON } from "@voidvoxel/package-json";


const BRAINTIME_TMP_DIR = path.resolve(
    path.join(
        tmpdir(),
        "zerdaRuntime"
    )
);

const BRAINTIME_MODULE_CACHE_DIR = path.resolve(
    path.join(
        BRAINTIME_TMP_DIR,
        "modules",
    )
);


export class ZerdaRuntimeModule {
    /**
     * @type {PluginManager}
     */
    #npm

    /**
     * @type {PackageJSON}
     */
    #packageJSON

    /**
     * @type {string}
     */
    #path

    /**
     * @type {boolean}
     */
    #temporary

    /**
     * @type {string}
     */
    #tmpdir


    static async clearCache () {
        await rm(
            BRAINTIME_MODULE_CACHE_DIR,
            {
                force: true,
                recursive: true
            }
        );

        await mkdir(
            BRAINTIME_MODULE_CACHE_DIR,
            {
                recursive: true
            }
        );
    }


    constructor (
        moduleName,
        options = {}
    ) {
        this.name = moduleName;
        this.version = '0.0.0';

        this.#path = null;

        this.#temporary = options.temporary ?? false;

        this.#tmpdir = null;

        if (existsSync(moduleName)) {
            const modulePath = moduleName;

            const packageJSON = PackageJSON.readFileSync(modulePath);

            this.#packageJSON = packageJSON;

            moduleName = packageJSON.name;

            this.#path = modulePath;
        }

        const cwd = path.resolve(
            path.join(
                BRAINTIME_MODULE_CACHE_DIR,
                moduleName
            )
        );

        if (!existsSync(cwd)) {
            mkdirSync(
                cwd,
                {
                    recursive: true
                }
            );
        }

        if (this.#temporary) {
            process.on(
                'exit',
                () => {
                    rmSync(
                        cwd,
                        {
                            force: true,
                            recursive: true
                        }
                    );
                }
            );
        }

        this.#npm = new PluginManager(
            {
                cwd,
                pluginsPath: path.resolve(
                    path.join(
                        cwd,
                        'node_modules'
                    )
                )
            }
        );

        const nodeModulesPath = path.resolve(
            path.join(
                cwd,
                'node_modules'
            )
        );

        const modulePath = path.resolve(
            path.join(
                nodeModulesPath,
                this.#packageJSON.name
            )
        );

        this.#tmpdir = modulePath;

        this.#injectGlobalsSync();
    }


    /**
     * Get the `PackageJSON` of this `ZerdaRuntimeModule`.
     * @returns {PackageJSON}
     * The `PackageJSON` of this `ZerdaRuntimeModule`.
     */
    getPackageJSON () {
        return this.#packageJSON;
    }


    /**
     * Get the layer structure of the model.
     * @returns {*}
     * The structure of the model.
     */
    layers () {
        return structuredClone(this.#packageJSON.zerdaRuntime.layers);
    }


    /**
     * Require the module.
     * @returns {Promise<Function<number[], number[]>>}
     */
    async require () {
        const tmpModuleDir = path.resolve(
            path.join(
                BRAINTIME_TMP_DIR,
                '.tmp_modules',
                this.#packageJSON.name
            )
        );

        cpSync(
            this.#path,
            tmpModuleDir,
            {
                force: true,
                recursive: true
            }
        );

        // TODO: Convert all module imports to CommonJS requires.

        if (this.#path && existsSync(this.#path)) {
            const packageJSON = await PackageJSON.readFile(this.#path);

            this.name = packageJSON.name;

            if (!this.#npm.alreadyInstalled(this.name)) {
                const { location, name } = await this.#npm.installFromPath(tmpModuleDir);

                this.name = name;
            }
        }

        rmSync(
            tmpModuleDir,
            {
                force: true,
                recursive: true
            }
        );

        return this.#npm.require(this.name);
    }


    async loadPackageJSON () {
        this.#packageJSON = await PackageJSON.readFile(this.#path);
    }


    async savePackageJSON () {
        await PackageJSON.writeFile(
            this.#path,
            this.#packageJSON
        );
    }


    #injectGlobalsSync () {
        const modulePaths = globSync(`${this.#tmpdir}/**/*.js`);

        this.#_injectGlobalsSync(...modulePaths);
    }


    #_injectGlobalsSync (...modulePaths) {
        for (let modulePath of modulePaths) {
            const sourceCode = readFileSync(
                modulePath,
                'utf-8'
            );

            const injector = new JavaScriptInjector(sourceCode);

            injector.addHeader(`globalThis.brain = require('brain.js')`);

            writeFileSync(
                modulePath,
                injector.toString(),
                'utf-8'
            );
        }
    }
}
