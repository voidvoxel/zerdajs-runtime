import { Braintime } from "../src/index.mjs";


test(
    "initialize braintime",
    async () => {
        const braintime = new Braintime(
            {
                cwd: "tmp"
            }
        );

        await braintime.evalModule("examples/xor");
    },
    30000
);
