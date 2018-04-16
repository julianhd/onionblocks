# OnionBlocks

**OnionBlocks** is a decentralized pseudonymous chat room using onion routing and blockchain.

## Getting Started

OnionBlocks can be run using Docker or Node.js. Using Docker will deploy a network with multiple chat servers, while Node.js will deploy a network with a single chat server.

### Using Docker

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
