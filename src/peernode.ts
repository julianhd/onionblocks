import http from "http"
import fs from "fs"
import NodeRSA from "node-rsa"
import OnionNode from "Blockchain"

var rsa = new NodeRSA({ b: 256 })
var serverPort = 8100


var peerNodeServer = http.createServer((req, res) => {
	if (req.method == "POST" && req.url == "/request") {
		var decryptedMessage = rsa.decrypt(res)

		if (decryptedMessage["type"] == "relay") {
      
      // ------ TO BE TESTED --------
			let options = { hostname: decryptedMessage["next"], port: serverPort, path: '/request', method: 'POST'};
      
      http.request(options);
     
		} else if (decryptedMessage["type"] == "exit") {
      
      // ------------ TEMP ------------
      let options = { hostname: "127.0.0.1", port: 80, path: '/mine', method: 'POST'};
      http.request(options);
      
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
	var fileName = /*'./data/' */ "onion" + serverPort + ".json"
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
	console.log("timer")
}
