import createStaticServer from "./createStaticServer"

const staticServer = createStaticServer()
staticServer.listen(8080, "127.0.0.1")

console.log("Server running at http://127.0.0.1:8080")
