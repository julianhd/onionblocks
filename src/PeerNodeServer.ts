import http from "http"
import express from "express"
import fs from "fs"
import NodeRSA from "node-rsa"
import cors from "cors"

var operating = require('os');

import { OnionNode, BlockContent, Entity } from './Blockchain.ts';

/**
The PeerNode Server,
This server relays messages from one Node to another
While progressively decrypting the message
*/
class PeerNodeServer {
  public readonly server : http.server;
  const var rsa = new NodeRSA({ b: 256 })
  const var serverPort = 8100
  
  constructor() {
    const app = express();
    app.use(cors);
    
    // Handle POST requests
    app.post("/request", async (req, res) => {
      var decryptedMessage = rsa.decrypt(res);
      
      if (decryptedMessage["type"] == "relay") {
      
      // ------ TO BE TESTED --------
			let options = { hostname: decryptedMessage["next"], path: '/request', method: 'POST', body: decryptedMessage["message"]};
      
      http.request(options);
      
      res.end();
      } else if (decryptedMessage["type"] == "exit") {
        // ------------ TODO ------------
        //Call Miner.mine
        res.end();
      } else {
        var error : string = "Unknown request type: " + decryptedMessage["type"];
        console.log(error)
        res.status(404).send(error);
      }
    });
    
    this.server = http.createServer(app);
  }
  
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
}

/**
 * Returns an HTTP server that handles relaying encrypted messages
 */
export default function createPeerNodeServer() {
	const node = new PeerNodeServer()
	return node.server
}