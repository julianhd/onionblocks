import http from "http"
import finalhandler from "finalhandler"
import serveStatic from "serve-static"

const serve = serveStatic("./public")
http
	.createServer((req, res) => {
		const done = finalhandler(req, res)
		serve(req as any, res as any, done)
	})
	.listen(8080, "127.0.0.1")

console.log("Server running at http://127.0.0.1:8080/")
