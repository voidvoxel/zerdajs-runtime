import * as brain from 'brain.js';


const nn = new brain.NeuralNetworkGPU();

nn.train(
    [
        { input: [ 0, 0 ], output: [ 0 ] },
        { input: [ 0, 1 ], output: [ 1 ] },
        { input: [ 1, 0 ], output: [ 1 ] },
        { input: [ 1, 1 ], output: [ 0 ] }
    ],
    {
        // log: (details) => console.log(details),
        // logPeriod: 500
    }
);


function run (...args) {
    const result = nn.run(args);

    // console.log(...args, Math.round(result[0]), result[0]);

    return result;
}


run(0, 0);
run(0, 1);
run(1, 0);
run(1, 1);
