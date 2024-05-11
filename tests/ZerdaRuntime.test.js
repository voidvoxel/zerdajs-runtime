import { existsSync, mkdirSync, rmSync } from "fs";


import { ZerdaRuntime } from "../src/index.mjs";


const TEST_CWD = "tmp";


function initialize () {
    if (!existsSync(TEST_CWD)) {
        mkdirSync(
            TEST_CWD,
            {
                recursive: true
            }
        );
    }
}


function cleanup () {
    rmSync(
        TEST_CWD,
        {
            force: true,
            recursive: true
        }
    );
}


beforeAll(initialize);
afterAll(cleanup);


test(
    "run module `add-cjs`",
    async () => {
        const repositoryName = 'voidvoxel/add-cjs';

        const zerdaRuntime = new ZerdaRuntime(
            {
                cwd: TEST_CWD
            }
        );

        const add = await zerdaRuntime.evalGitHub(repositoryName);

        expect(typeof add).toBe('function');

        expect(add(1, 2)).toBe(3);
    },
    30000
);
