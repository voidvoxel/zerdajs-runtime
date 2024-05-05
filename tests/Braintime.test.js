import { Braintime } from "../src/index.mjs";


test(
    "run module `xor`",
    async () => {
        const exampleDir = "examples/xor";

        const braintime = new Braintime(
            {
                cwd: exampleDir
            }
        );

        const xorModule = await braintime.evalModule(exampleDir);
        const xorExports = await xorModule.require();

        expect(typeof xorExports).toBe('function');

        const xor = (x, y) => xorExports(x, y)[0];

        expect(xor(0, 0)).toBe(0);
        expect(xor(0, 1)).toBe(1);
        expect(xor(1, 0)).toBe(1);
        expect(xor(1, 1)).toBe(0);
    },
    30000
);
