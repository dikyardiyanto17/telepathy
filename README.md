# telepathy

## Parameter Server

### Server_Parameter || serverParameter

```js
class Server_Parameter {
	allRooms: {}
	allUsers: {}
}
```

```js
const serverParameter = new Server_Parameter()
serverParameter.worker = Worker
serverParameter.allRooms[roomName] = {
	router: Router,
	participants: [{
		username: "String",
		socketId: "String",
		roomName: "String",
		transports: [transportId: "String", transportId: "String"],
		producers: [producerId: "String", producerId: "String"],
		consumers: [consumerId: "String", consumerId: "String"],
	}],
}

serverParameter.allUsers[socketId] = {
    socketId: "String",
    roomName: "String",
    socket: Socket,
    producers: [producerId: "String", producerId: "String"],
    consumers: [consumerId: "String", consumerId: "String"],
    transports: [transportId: "String", transportId: "String"] }
```

### Mediasoup_Parameter || mediasoupParameter

```js
class Mediasoup_Parameter {
	transports = []
	producers = []
	consumers = []
}

let mediasoupParameter = new Mediasoup_Parameter()
mediasoupParameter = {
    transports = [
	{
		socketId: "String",
		transport: Transport,
		roomName: "String",
		consumer: true || false,
	},
    ]
    producers = [{ producer: Producer, roomName: "String", socketId: "String", username: "String" }]
    consumers = [{ consumer: Consumer, roomName: "String", socketId: "String", username: "String" }]
}
```

```js

```

## Parameter Client

### Parameter || parameter

```js
const { params } = require("../config/mediasoup")

class Parameters {
	localStream = null
	videoParams = { params, appData: { label: "Video" } }
	audioParams = { appData: { label: "Audio" } }
	consumingTransports = [],
    consumerTransports = []
}

const parameter = new Parameter()

parameter = {
    localStream: MediaStream,
    videoParams: { params, appData: { label: "Video" }, track: MediaStream },
    audioParams: { appData: { label: "Audio" }, track: MediaStream },
    consumingTransports = [remoteProducerId: "String", remoteProducerId: "String"],
    username: "String",
    socketId: "String",
    isVideo: true || false,
    isAudio: true || false,
    roomName: "String",
    device: MediasoupClientDevice,
    rtpCapabilities: RTPCapabilities,
    producerTransport: ProducerTransport,
    audioProducer: ProducerAudio,
    videoProducer: ProducerVideo,
    allUsers: [
        {
            socketId: "String",
            picture: "String",
            audio: {
                isActive: true || false,
                track: MediaStream,
                producerId: "String",
                transportId: "String",
                consumerId: "String"
            },
            video: {
                isActive: true || false,
                track: MediaStream,
                producerId: "String",
                transportId: "String",
                consumerId: "String"
            }
        }
    ]
}
```
