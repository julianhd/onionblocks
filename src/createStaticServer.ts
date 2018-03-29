import http from "http"
import finalhandler from "finalhandler"
import serveStatic from "serve-static"

/**
 * Returns an HTTP server that serves content in the public directory.
 */
export default function createStaticServer() {
	const staticServer = serveStatic("./public")
	return http.createServer((req, res) => {
		const done = finalhandler(req, res)
		staticServer(req as any, res as any, done)
	})
}
