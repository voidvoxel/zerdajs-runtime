import { Braintime } from "../src/index.mjs";


test(
    "initialize braintime",
    async () => {
        const exampleDir = "examples/xor";

        const braintime = new Braintime(
            {
                cwd: exampleDir
            }
        );

        const xor = await braintime.evalModule(exampleDir);

        expect(typeof xor).toBe('function');

        expect(xor(0, 0)).toBe(0);
        expect(xor(0, 1)).toBe(1);
        expect(xor(1, 0)).toBe(1);
        expect(xor(1, 1)).toBe(0);
    },
    30000
);
