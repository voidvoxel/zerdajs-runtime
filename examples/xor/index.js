const { existsSync, writeFileSync, readFileSync } = require('fs');


const brain = require('brain.js');
const path = require('path');


const MODEL_PATH = path.resolve(
    path.join(
        __dirname,
        "model.json"
    )
);


// Create a new neural network.
const nn = new brain.NeuralNetworkGPU();


function train () {
    // Train the neural network to calculate XOR (exclusive or).
    nn.train(
        [
            { input: [ 0, 0 ], output: [ 0 ] },
            { input: [ 0, 1 ], output: [ 1 ] },
            { input: [ 1, 0 ], output: [ 1 ] },
            { input: [ 1, 1 ], output: [ 0 ] }
        ],
        {
            errorThresh: 0.011,
            iterations: 5000,
            // log: (details) => console.log(details),
            // logPeriod: 1000
        }
    );

    writeFileSync(
        MODEL_PATH,
        JSON.stringify(
            nn.toJSON()
        ),
        'utf-8'
    );
}


if (!existsSync(MODEL_PATH)) {
    train();
}

nn.fromJSON(
    JSON.parse(
        readFileSync(
            MODEL_PATH,
            'utf-8'
        )
    )
);


function xor (x, y) {
    // Create an array containing the `x` and `y` values.
    const input = [ x, y ];

    // Return the neural network's prediction of `x` XOR `y`.
    return [ Math.round(nn.run(input)[0]) ];
}


module.exports = xor;
