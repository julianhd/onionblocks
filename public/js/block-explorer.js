class BlockExplorer extends React.Component {
	constructor(props) {
		super(props)
		this.state = {
			blocks: [],
		}
	}

	componentDidMount() {
		const websocket = new WebSocket(`ws://${window.location.host}/api/blocks`)
		websocket.onmessage = async event => {
			const data = JSON.parse(event.data)
			data.__signature = await sha256(data.data.signature)
			data.__key = await sha256(data.data.public)
			if (data.data.content.type === "user") {
				data.__user_public = await sha256(data.data.content.public)
			}
			this.setState(prevState => ({
				blocks: [data, ...prevState.blocks],
			}))
		}
	}

	render() {
		const elements = []
		for (const block of this.state.blocks) {
			const { data } = block
			const visualizer = (
				<div className="bx-block" key={data.uuid}>
					<BlockProp name="ID" content={data.uuid} />
					<BlockProp name="Previous" content={data.previous_uuid} />
					<BlockProp name="Nonce" content={data.nonce} />
					<BlockProp name="Signature" content={block.__signature} />
					<BlockProp name="Public Key" content={block.__key} />
					<BlockProp name="Type" content={data.content.type} />
					{data.content.type === "chat" ? (
						<div>
							<BlockProp name="Timestamp" content={data.content.timestamp} />
							<BlockProp name="From" content={data.content.from} />
							<BlockProp name="Message" content={data.content.message} />
						</div>
					) : null}
					{data.content.type === "user" ? (
						<div>
							<BlockProp name="Timestamp" content={data.content.timestamp} />
							<BlockProp name="Name" content={data.content.name} />
							<BlockProp name="Public Key" content={block.__user_public} />
						</div>
					) : null}
				</div>
			)
			elements.push(visualizer)
		}
		return <div>{elements}</div>
	}
}

function BlockProp({ name, content }) {
	return (
		<div>
			<span className="bx-prop">{name}</span>{" "}
			<span className="bx-content">{content}</span>
		</div>
	)
}

ReactDOM.render(
	<BlockExplorer />,
	document.getElementById("block-explorer-root"),
)

// Source: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
function sha256(str) {
	// We transform the string into an arraybuffer.
	var buffer = new TextEncoder("utf-8").encode(str)
	return crypto.subtle.digest("SHA-256", buffer).then(function(hash) {
		return hex(hash)
	})
}

// Source: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
function hex(buffer) {
	var hexCodes = []
	var view = new DataView(buffer)
	for (var i = 0; i < view.byteLength; i += 4) {
		// Using getUint32 reduces the number of iterations needed (we process 4 bytes each time)
		var value = view.getUint32(i)
		// toString(16) will give the hex representation of the number without padding
		var stringValue = value.toString(16)
		// We use concatenation and slice for padding
		var padding = "00000000"
		var paddedValue = (padding + stringValue).slice(-padding.length)
		hexCodes.push(paddedValue)
	}

	// Join all the hex strings into one
	return hexCodes.join("")
}
