# `@zerda.js/runtime`

Zerda.js Runtime Environment | Cross-platform | Modular | Wide GPU support

## What is the Zerda.js Runtime Environment?

The Zerda Runtime Environment (Zerda RE) is a JavaScript runtime environment
(JSRE) that sits on top of an existing JSRE to supply it with the Brain.js
library, with GPU-acceleration supporting a wide variety of GPUs to ensure
optimal performance across all devices.
This makes it easy to train and deploy AI models not only on individual
devices, but also across a large network of internet-connected devices.

Furthermore, Zerda also provides several classes and functions that make
peer-to-peer (P2P) communication between nodes in the network effortless.
Simply create a new session, share your passphrase with other users
(or programmatically share it with other nodes),
and you'll have a distributed AI network put together in no time.

## Installation

### Global

#### To install globally

```sh
npm i -g @zerda.js/runtime
```

### Dependency

#### To install as a dependency

```sh
npm i @zerda.js/runtime
```

#### To use as a dependency

```json
{
    "name": "@voidvoxel/auto-encoder",
    "main": "src/index.mjs",
    "scripts": {
        "start": "zerda ."
    }
}
```

## Usage

### Command line interface

#### Process a string

```sh
echo "[0, 1]" | zerda examples/xor
```

#### Process an input file

```sh
cat samples/input.json | zerda examples/xor > samples/output.txt
```
