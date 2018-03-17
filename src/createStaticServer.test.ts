import http from "http"
import assert from "assert"

import createStaticServer from "./createStaticServer"

test("Static server works", done => {
	const staticServer = createStaticServer()
	const server = staticServer.listen(8080, "127.0.0.1", () => {
		http.get("http://127.0.0.1:8080", res => {
			assert.equal(200, res.statusCode)
			server.close(done)
		})
	})
})
