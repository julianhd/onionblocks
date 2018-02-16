//@flow

import http from "http"

var NodeRSA = require("node-rsa")

var httpServer = http.createServer((req, res) => {})

httpServer.listen(8100, "127.0.0.1") // Port # subject to change

console.log("PeerNode Server Running on 127.0.0.1:8100")
init()

//Init function
function init() {
	//TODO: Check existance of RSA key file

	var key = new NodeRSA({ b: 256 }) // create 256-bit rsa key pair.

	// Generate First key pair.
	key.generateKeyPair()
	var publicKey1 = key.exportKey("pkcs8-public") //export public key
	var privateKey1 = key.exportKey("pkcs8-private") //export private key
	console.log("First key pair")
	console.log("----------------------------")
	console.log("Public Key: " + publicKey1)
	console.log("Private Key: " + privateKey1)

	// Generate Second key pair
	key.generateKeyPair()
	var publicKey2 = key.exportKey("pkcs8-public") //export public key
	var privateKey2 = key.exportKey("pkcs8-private") //export private key
	console.log("Second key pair")
	console.log("----------------------------")
	console.log("Public Key: " + publicKey2)
	console.log("Private Key: " + privateKey2)

	// Generate third key pair
	key.generateKeyPair()
	var publicKey3 = key.exportKey("pkcs8-public") //export public key
	var privateKey3 = key.exportKey("pkcs8-private") //export private key
	console.log("Third key pair")
	console.log("----------------------------")
	console.log("Public Key: " + publicKey3)
	console.log("Private Key: " + privateKey3)

	//TODO: write to RSA file.

	console.log("Initalized")
}
