import { PackageJSON } from "@voidvoxel/package-json";
import { existsSync, mkdirSync, readdirSync, rmSync, rmdirSync } from "fs";
import { mkdir, rm } from "fs/promises";
import { PluginManager } from "live-plugin-manager";
import { tmpdir } from "os";
import path from "path";


const BRAINTIME_TMP_DIR = path.resolve(
    path.join(
        tmpdir(),
        "braintime"
    )
);

const BRAINTIME_MODULE_CACHE_DIR = path.resolve(
    path.join(
        BRAINTIME_TMP_DIR,
        "module_cache",
    )
);


export class BraintimeModule {
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


    static async clearModuleCache () {
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

        if (existsSync(moduleName)) {
            const modulePath = moduleName;

            const packageJSON = PackageJSON.readFileSync(modulePath);

            this.#packageJSON = packageJSON;

            moduleName = packageJSON.name;

            this.#path = modulePath;
        }

        const cwd = path.resolve(
            path.join(
                BRAINTIME_TMP_DIR,
                "modules",
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
    }


    /**
     * Get the `PackageJSON` of this `BraintimeModule`.
     * @returns {PackageJSON}
     * The `PackageJSON` of this `BraintimeModule`.
     */
    getPackageJSON () {
        return this.#packageJSON;
    }


    /**
     * Require the module.
     * @returns {Promise<Function<number[], number[]>>}
     */
    async require () {
        if (this.#path && existsSync(this.#path)) {
            const packageJSON = await PackageJSON.readFile(this.#path);

            this.name = packageJSON.name;

            if (!this.#npm.alreadyInstalled(this.name)) {
                const { location, name } = await this.#npm.installFromPath(this.#path);

                this.name = name;
            }
        }

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
}
