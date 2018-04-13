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
			const key = JSON.stringify(request)
			const visualizer = (
				<div className="bx-block" key={key}>
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

function sha256(str) {
	var shaObj = new jsSHA("SHA-256", "TEXT")
	shaObj.update(str)
	var hash = shaObj.getHash("HEX")
	return hash
}
