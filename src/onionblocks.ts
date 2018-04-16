#!/usr/bin/env node

import createChatServer from "./ChatServer"
import createPeerNodeServer from "./PeerNodeServer"
import BlockChainServer from "./BlockChainServer"
import Blockchain from "./Blockchain"
import BlockTree from "./BlockTree"
import os from "os"
import dns from "dns"
import fs from "fs"

const CHAT_SERVER_PORT_OFFSET = 0
const BLOCKCHAIN_PORT_OFFSET = 1
const ONION_PORT_OFFSET = 2
const PEER_UPDATE_MS = 30000

const { PORT_RANGE_START = "8000" } = process.env
const { MASTER_HOST = "localhost", MASTER_PORT = "8001" } = process.env

try {
	fs.mkdirSync("./data")
} catch (error) {
	if (error.code !== "EEXIST") {
		throw error
	}
}

const blocktree = new BlockTree()
const blockchain = new Blockchain(null, blocktree)

const portRangeStart = Number.parseInt(PORT_RANGE_START)
const masterPort = Number.parseInt(MASTER_PORT)
const chatPort = portRangeStart + CHAT_SERVER_PORT_OFFSET
const blockchainPort = portRangeStart + BLOCKCHAIN_PORT_OFFSET
const onionPort = portRangeStart + ONION_PORT_OFFSET

const chatServer = createChatServer(blockchain)
chatServer.server.listen(chatPort)
console.log("Chat hosted at http://localhost:" + chatPort)

dns.lookup(os.hostname(), (err, address, family) => {
	if (err) {
		throw err
	}

	const blockchainServer = new BlockChainServer(
		blocktree,
		PEER_UPDATE_MS,
		address,
		blockchainPort,
		MASTER_HOST,
		masterPort,
	)
	blockchainServer.addMasterPeer(MASTER_HOST, masterPort) // TODO some kind of cmd line args to set no master
	blockchainServer.server.listen(blockchainPort)
	console.log("Blockchain hosted at http://localhost:" + blockchainPort)
})

const nodeServer = createPeerNodeServer(onionPort, blockchain, chatServer)
nodeServer.listen(onionPort)
console.log("Onion node hosted at http://localhost:" + onionPort)
