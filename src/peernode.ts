import http from "http"
import fs from "fs"
import NodeRSA from "node-rsa"

var operating = require('os');

import { OnionNode, BlockContent, Entity } from './Blockchain.ts';

var rsa = new NodeRSA({ b: 256 })
var serverPort = 8100


var peerNodeServer = http.createServer((req, res) => {
	if (req.method == "POST" && req.url == "/request") {
		var decryptedMessage = rsa.decrypt(res)

		if (decryptedMessage["type"] == "relay") {
      
      // ------ TO BE TESTED --------
			let options = { hostname: decryptedMessage["next"], port: serverPort, path: '/request', method: 'POST', body: decryptedMessage["message"]};
      
      http.request(options);
     
		} else if (decryptedMessage["type"] == "exit") {
      
      // ------------ TODO ------------
      //Call Miner.mine
      
		} else {
			console.log("Unknown request type: " + decryptedMessage["type"])
		}
	}
})

peerNodeServer.listen(serverPort, "127.0.0.1") // Port # subject to change

console.log("PeerNode Server Running on 127.0.0.1:8100")

init()

//Init function
function init() {
	var fileName = "onion" + serverPort + ".json"
	console.log(fileName)
	fs.exists(fileName, exists => {
		if (exists) {
			console.log("JSON exists, loading keys...")
			//Load RSA files
			var keys = JSON.parse(fs.readFileSync(fileName, "utf8"))

			rsa.importKey(keys["public"], "pkcs8-public")
			rsa.importKey(keys["private"], "pkcs8-private")

			console.log("Keys loaded.")
		} else {
			console.log("Generating keys...")

			// Generate RSA key pair.
			rsa.generateKeyPair()
			var publicKey = rsa.exportKey("pkcs8-public") //export public key
			var privateKey = rsa.exportKey("pkcs8-private") //export private key
			console.log("First key pair")
			console.log("----------------------------")

			var keys = { public: publicKey, private: privateKey }
			var jsonString = JSON.stringify(keys)

			//Create RSA key JSON file
			fs.writeFile(fileName, jsonString, function(err) {
				if (err) {
					return console.log(err)
				}

				console.log("Keys generated.")
			})
		}
	})

	setInterval(timerRun, 30000)
}

class Node implements OnionNode
{
  constructor(h: string) { this.host = h; }
  type: "node"
	timestamp: number
	host: string
	public: string
}

function timerRun() {
	console.log("Created Entity");
  var host = "127.0.0.1";
  var timestamp = Date.now();
  

  var node : OnionNode = { type: "node", timestamp: Date.now(), host: operating.hostname(), public: rsa.exportKey("pkcs8-public") };
  
  var nodeString = JSON.stringify(node)
  var nodeBuffer = Buffer.from(nodeString)
  
  var entity : Entity = { object: node, signature:rsa.sign(userBuffer).toString("hex") };
  
  OnionRoutingRequest(entity);
  
}
