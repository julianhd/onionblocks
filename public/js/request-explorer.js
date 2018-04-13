class RequestExplorer extends React.Component {
	constructor(props) {
		super(props)
		this.state = {
			requests: [],
		}
	}

	componentDidMount() {
		const websocket = new WebSocket(`ws://${window.location.host}/api/requests`)
		websocket.onmessage = async event => {
			const data = JSON.parse(event.data)
			data.__encrypted = await sha256(data.encrypted)
			console.log(data)
			this.setState(prevState => ({
				requests: [data, ...prevState.requests],
			}))
		}
	}

	render() {
		const elements = []
		for (const request of this.state.requests) {
			const visualizer = (
				<div className="bx-block" key={request.uuid}>
					<BlockProp name="Type" content={request.type} />
					{request.type === "relay" ? (
						<div>
							<BlockProp name="Next" content={request.next} />
							<BlockProp name="Encrypted" content={request.__encrypted} />
						</div>
					) : null}
					{request.type === "exit" ? (
						<div>
							<BlockProp
								name="Content Type"
								content={request.content.content.type}
							/>
							<BlockProp
								name="Content"
								content={JSON.stringify(request.content.content)}
							/>
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
	<RequestExplorer />,
	document.getElementById("request-explorer-root"),
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
