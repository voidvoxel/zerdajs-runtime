# `braintime`

Braintime AI framework | Cross-platform | Modular | Wide GPU support

## What is Braintime?

Braintime is a JavaScript runtime environment (JSRE) that sits on top of an
existing JSRE to supply it with the Brain.js library, with GPU-acceleration
supporting a wide variety of GPUs to ensure optimal performance across all
devices.
This makes it easy to train and deploy AI models not only on individual
devices, but also across a large network of internet-connected devices.

Furthermore, Braintime also provides several classes and functions that make
peer-to-peer (P2P) communication between nodes in the network effortless.
Simply create a new session, share your passphrase with other users
(or programmatically share it with other nodes),
and you'll have a distributed AI network put together in no time.

## Installation

### Global

#### To install Braintime globally

```sh
npm i -g braintime
```

### Dependency

#### To install Braintime as a dependency

```sh
npm i braintime
```

#### To use the Braintime dependency

```json
{
    "name": "auto-encoder",
    "main": "src/index.mjs",
    "scripts": {
        "start": "braintime ."
    }
}
```
