import { fork } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { homedir, tmpdir } from 'os';
import path from 'path';


import { default as Corestore } from 'corestore';
import { default as Hyperdrive } from 'hyperdrive';
import { PluginManager } from 'live-plugin-manager';


import randomInteger from '@voidvoxel/random-integer';
import { git } from 'git-cli-api';
import { getAbsolutePath, isDirectorySync } from 'pathify';
import * as semver from "semver";


import ZerdaPlugin from './ZerdaPlugin.mjs';


const SESSION_ID
    = randomInteger(
        0x00000000,
        0xFFFFFFFF
    ).toString(
        16
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
    #pluginManager


    /**
     * The cache directory used by this framework.
     */
    static cachedir () {
        return getAbsolutePath(
            homedir(),
            ".zerda",
            "runtime"
        );
    }


    /**
     * Clear the runtime cache.
     */
    static async clearCache () {
        // TODO: Throw an error if lock file exists.

        // Remove the cache directory.
        await rm(
            ZerdaRuntime.cachedir(),
            {
                force: true,
                recursive: true
            }
        );

        // Create the cache directory.
        await mkdir(
            ZerdaRuntime.cachedir(),
            {
                recursive: true
            }
        );
    }


    /**
     * The temporary directory used by this framework.
     */
    static tmpdir () {
        return getAbsolutePath(
            tmpdir(),
            "node_modules",
            "@zerda.js",
            "runtime",
            SESSION_ID
        );
    }


    constructor (
        options = {}
    ) {
        this.#cwd = getAbsolutePath(options.cwd ?? process.cwd());
        this.#nodeModulesPath = options.nodeModulesPath ?? 'node_modules';
    }


    async evalFile (
        modulePath,
        forkOptions = {}
    ) {
        await this.#initialize();

        const subprocess = fork(
            modulePath,
            forkOptions ?? {}
        );

        const exitCode = await new Promise(
            resolve => {
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


    async evalGitHub (repositoryName) {
        // Initialize the runtime environment.
        await this.#initialize();

        return this.require("github:" + repositoryName);
    }


    async evalModule (modulePath) {
        // Initialize the runtime environment.
        await this.#initialize();

        // Resolve the module path.
        modulePath = path.resolve(modulePath);

        // Require the module.
        return await this.require(modulePath);
    }


    async require (
        moduleName
    ) {
        // Stringify `moduleName`.
        moduleName = `${moduleName}`;

        if (moduleName.startsWith("gh:")) {
            moduleName = moduleName.replace(
                "gh:",
                "github:"
            );
        }

        // Initialize the runtime environment.
        await this.#initialize();

        // Require the module.
        let moduleExports;

        const MODULE_NAME_FILE_PREFIX = "file://";
        const MODULE_NAME_GITHUB_PREFIX = "github:";
        const MODULE_NAME_HYPER_PREFIX = "hyper:";


        if (moduleName.startsWith(MODULE_NAME_FILE_PREFIX)) {
            let modulePath
                =   moduleName.substring(
                        MODULE_NAME_FILE_PREFIX.length
                    );

            modulePath = path.resolve(modulePath);

            // Install the module.
            const installedPluginInfo = await this.#installFromPath(modulePath);

            // Update the module name.
            moduleName = installedPluginInfo.name;

            // Require the module.
            moduleExports = this.#pluginManager.require(moduleName);
        } else if (
            moduleName.startsWith(MODULE_NAME_GITHUB_PREFIX)
        ) {
            // Get the repository name.
            const repositoryName = moduleName
                .substring(
                    MODULE_NAME_GITHUB_PREFIX.length
                );

            // Get the repository's GitHub URL from the repository name.
            const repositoryURL = "https://github.com/" + repositoryName + ".git";

            const tmpDirId
                = randomInteger(
                    0x00000000,
                    0xffffffff
                ).toString(
                    16
                );

            const tmpPath = getAbsolutePath(
                ZerdaRuntime.tmpdir(),
                tmpDirId.toString()
            );

            // Clone the repository to the install location.
            await git.clone(
                repositoryURL,
                tmpPath
            );

            // Install the module.
            const installedPluginInfo = await this.#installFromPath(tmpPath);

            // Update the module name.
            moduleName = installedPluginInfo.name;

            // Require the module.
            moduleExports = this.#pluginManager.require(moduleName);

            // Remove the temporary directory.
            await rm(
                tmpPath,
                {
                    force: true,
                    recursive: true
                }
            );
        } else if (
            moduleName.startsWith(MODULE_NAME_HYPER_PREFIX)
        ) {
            const url = new URL(moduleName);

            let publicKey = url.hostname;
            let version = url.username ?? null;

            const VERSION_REGEX = /[0-9]+/;

            if (
                version
                    && version.match(VERSION_REGEX)
            ) {
                version = Number.parseInt(version);
            }

            const corestoreStorage = getAbsolutePath(
                this.#cwd,
                ".hyperdrives",
                publicKey
            );

            if (!existsSync(corestoreStorage)) {
                await mkdir(
                    corestoreStorage,
                    {
                        recursive: true
                    }
                );
            }

            const corestore = new Corestore(corestoreStorage);

            const hyperdrive = new Hyperdrive(
                corestore,
                publicKey
            );

            const snapshot = await hyperdrive.checkout(version);

            await snapshot.download();

            // TODO: await snapshot.get(fileName) for each file in the snapshot

            moduleExports = this.#pluginManager.require(moduleName);
        } else if (
            isDirectorySync(moduleName)
        ) {
            const modulePath = getAbsolutePath(moduleName);

            const moduleInfo = await this.#installFromPath(modulePath);

            moduleName = moduleInfo.name;

            moduleExports = this.#pluginManager.require(moduleName);
        } else {
            if (moduleName.substring(1).includes("@")) {
                if (moduleName[0] === "@") {
                    const [ name, version ] = moduleName.substring(1).split("@");

                    moduleName = "@" + name;

                    let info;

                    try {
                        info = await this.#pluginManager.install(moduleName, version);
                    } catch {
                        info = await this.#pluginManager.install(moduleName);

                        if (semver.valid(version)) {
                            if (!semver.satisfies(info.version, version)) {
                                throw new Error(`Version \`${info.version}\` does not meet requirement \`${version}\`.`);
                            }
                        }
                    }
                } else {
                    const [ name, version ] = moduleName.split("@");

                    moduleName = name;

                    let info;

                    try {
                        info = await this.#pluginManager.install(moduleName, version);
                    } catch {
                        try {
                            info = await this.#pluginManager.install(moduleName);

                            if (semver.valid(version)) {
                                if (!semver.satisfies(info.version, version)) {
                                    let errorMessage
                                        =   "Version `"
                                        +   info.version
                                        +   "` does not meet requirement `"
                                        +   version
                                        +   "`."
                                    ;

                                    throw new Error(errorMessage);
                                }
                            }
                        } catch (error) {
                            throw error;
                        }
                    }
                }
            } else {
                await this.#pluginManager.install(moduleName);
            }

            moduleExports = this.#pluginManager.require(moduleName);
        }

        const plugin = new ZerdaPlugin(
            moduleExports,
            {
                name: moduleName
            }
        );

        return moduleExports;
    }


    async #initialize () {
        // If this has already been initialized, return.
        if (this.#pluginManager) {
            return;
        }

        // Create a new `PluginManager` to manage modules.
        this.#pluginManager = new PluginManager(
            {
                cwd: this.#cwd,
                pluginsPath: getAbsolutePath(
                    ZerdaRuntime.cachedir(),
                    'plugins'
                )
            }
        );
    }


    async #installFromPath (modulePath) {
        return await this.#pluginManager.installFromPath(
            modulePath
        );
    }
}


if (!isDirectorySync(ZerdaRuntime.cachedir())) {
    await ZerdaRuntime.clearCache();
}


process.on(
    'exit',
    async () => await rm(
        ZerdaRuntime.tmpdir(),
        {
            force: true,
            recursive: true
        }
    )
);
