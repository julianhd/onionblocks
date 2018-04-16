# OnionBlocks

**OnionBlocks** is a decentralized pseudonymous chat room using onion routing and blocktree technology.

It lets users publicly chat with each other without revealing their real identity. This is accomplished by routing messages through intermediary nodes to hide the IP address of the sender. Each node only knows the address of the next node to forward the message to. The message itself is encrypted and is only revealed to the final node.

The network enables pseudonymous verification of participants using public keys stored on a blocktree. This ensures that, for example, a user “Alice#a89fa2” will always be the same person on the network, and nobody else can impersonate her name and hash combination.

The chat history is also saved on the blocktree to provide a tamper-resistant record of messages. If the user ever loses their local record of the chat history, they can recover it from the blocktree of any untrusted user and be assured that the message sequence wasn't modified.

A blocktree is used instead of a blockchain to allow for instant transmission of chat messages without waiting for a block to be mined. If two users send a chat message at the same instant, they will both create a block with the same parent and append it to the blocktree. Messages from all branches of the tree will be displayed in the client.

## Getting Started

OnionBlocks can be run using either Docker or Node.js.

### Using Docker

Using Docker will deploy a network with multiple chat servers.

#### Prerequisites

* [Docker CE](https://www.docker.com/community-edition#/download)

#### Usage

```sh
$ git clone https://github.com/julianhd/onionblocks.git && cd onionblocks
$ docker-compose up
```

Access the chat clients at:

* http://localhost:8080
* http://localhost:8081
* http://localhost:8082
* http://localhost:8083
* http://localhost:8084

### Using Node.js

Using Node.js will deploy a network with a single chat server.

#### Prerequisites

* [Node.js 9](https://nodejs.org/en/)

#### Usage

```sh
$ git clone https://github.com/julianhd/onionblocks.git && cd onionblocks
$ npm install
$ npm start
```

Access the chat client at [http://localhost:8080](http://localhost:8080).

## Authors

* Thomas Backs
* Mathieu Breault
* Julian Hoang
* Stephanie Nguyen
* Dylan Seto
* Helen Tam
* Amal Zemmouri
