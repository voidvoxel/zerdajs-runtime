import { existsSync, mkdirSync, rmSync } from "fs";


import { ZerdaRuntime } from "../src/index.mjs";
import moduleExports from "../../zerda-example-plugin";


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


// test(
//     "run module `zerda-example-plugin`",
//     async () => {
//         const repositoryName = 'zerdajs/example-plugin';

//         const zerdaRuntime = new ZerdaRuntime(
//             {
//                 cwd: TEST_CWD
//             }
//         );

//         const add = await zerdaRuntime.evalGitHub(repositoryName);

//         expect(typeof add).toBe('function');

//         expect(add(1, 2)).toBe(3);
//     },
//     30000
// );



test(
    "run module `zerda-example-plugin`",
    async () => {
        const zerdaRuntime = new ZerdaRuntime(
            // {
            //     cwd: TEST_CWD
            // }
        );

        // const add = await zerdaRuntime.evalModule("../zerda-example-plugin");

        const run = moduleExports.run;

        expect(typeof run).toBe('function');

        for (let i = 0; i < 1000; i++) {
            const input = [ 1, 2 ];

            const output = await run(input);

            for (let index in input) {
                expect(output[index]).not.toBe(input[index]);
                expect(output[index]).toBeGreaterThan(0);
                expect(output[index]).toBeLessThan(4);
            }
        }
    },
    30000
);
