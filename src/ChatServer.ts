import http from "http"
import finalhandler from "finalhandler"
import serveStatic from "serve-static"

/**
 * Returns an HTTP server that serves content in the public directory.
 */
export default function createStaticChatServer() {
    const staticChatServer = serveStatic("./public")
    init();
	return http.createServer((req, res) => {
		const done = finalhandler(req, res)
		staticChatServer(req as any, res as any, done)
	})
}

/**
 * Initializes a user's variables in the chat server.
 */
function init() {
    loadRSA();
    createUserEntity();
}

/**
 * Loads the private and public key pair for a user.
 */
function loadRSA() {
    try {
        var user = require('./data/user.json');

        // Check if a private key does not exist
        if (!user.hasOwnProperty('private')) {

            // Generate new key pair
            var rsa = require('node-rsa');
            var keys = new rsa({ b: 256 });

            keys.generateKeyPair();

            var privateKey = keys.exportKey("pkcs8-private");
            var publicKey = keys.exportKey("pkcs8-public");

            // Prompt user for their name
            var name = prompt("Enter your name: ");

            // Save all new information into ./data.user.json
            var newUser = {private: privateKey, public: publicKey, name: name};
            var userString = JSON.stringify(newUser);

            user.writeFile('./data/user.json', userString, function(err) {
                if (err) {
                    return console.error(err);
                }
                console.log("Saved new user information into './data/user/json'.");
            });
        }

        var privateKey = user.private;
        var publicKey = user.public;
        var username = user.name;
    }
    catch (e) {
        console.log("Error in loading user information...");
    }
}

/**
 * Creates an Entity that is of type User with their name and public key.
 */
function createUserEntity() {
    // ...
}