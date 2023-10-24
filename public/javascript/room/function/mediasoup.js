const mediasoupClient = require("mediasoup-client")
const { createVideo, createAudio, insertVideo } = require("../ui/video")

const createDevice = async ({ parameter, socket }) => {
	try {
		parameter.device = new mediasoupClient.Device()
		await parameter.device.load({
			routerRtpCapabilities: parameter.rtpCapabilities,
		})
		await createSendTransport({ socket, parameter })
	} catch (error) {
		console.log("- Error Creating Device : ", error)
	}
}

const createSendTransport = async ({ socket, parameter }) => {
	try {
		socket.emit("create-webrtc-transport", { consumer: false, roomName: parameter.roomName }, ({ params }) => {
			parameter.producerTransport = parameter.device.createSendTransport(params)
			parameter.producerTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
				try {
					await socket.emit("transport-connect", {
						dtlsParameters,
					})

					callback()
				} catch (error) {
					errback("- Error Connecting Transport : ", error)
				}
			})

			parameter.producerTransport.on("produce", async (parameters, callback, errback) => {
				try {
					await socket.emit(
						"transport-produce",
						{
							kind: parameters.kind,
							rtpParameters: parameters.rtpParameters,
							appData: parameters.appData,
							roomName: parameter.roomName,
						},
						({ id, producersExist, kind }) => {
							callback({ id })
							if (producersExist && kind == "audio") getProducers({ parameter, socket })
						}
					)
				} catch (error) {
					errback(error)
				}
			})

			parameter.producerTransport.on("connectionstatechange", async (e) => {
				try {
					console.log("- State Change Producer : ", e)
				} catch (error) {
					console.log("- Error Connecting State Change Producer")
				}
			})
			connectSendTransport(parameter)
		})
	} catch (error) {
		console.log("- Error Creating Send Transport : ", error)
	}
}

const connectSendTransport = async (parameter) => {
	try {
		// Producing Audio And Video Transport
		parameter.audioProducer = await parameter.producerTransport.produce(parameter.audioParams)
		parameter.videoProducer = await parameter.producerTransport.produce(parameter.videoParams)

		parameter.audioProducer.on("trackended", () => {
			console.log("audio track ended")
		})

		parameter.audioProducer.on("transportclose", () => {
			console.log("audio transport ended")
		})

		parameter.videoProducer.on("trackended", () => {
			console.log("video track ended")
		})

		parameter.videoProducer.on("transportclose", () => {
			console.log("video transport ended")
		})
	} catch (error) {
		console.log("- Error Connecting Transport Producer : ", error)
	}
}

// Get Producers
const getProducers = ({ socket, parameter }) => {
	try {
		socket.emit("get-producers", { roomName: parameter.roomName }, (producerList) => {
			// Informing Consumer Transport
			producerList.forEach((id) => {
				signalNewConsumerTransport({ remoteProducerId: id, socket, parameter })
			})
		})
	} catch (error) {
		console.log("- Error Get Producer : ", error)
	}
}

const signalNewConsumerTransport = async ({ remoteProducerId, socket, parameter }) => {
	try {
		if (parameter.consumingTransports.includes(remoteProducerId)) return
		parameter.consumingTransports.push(remoteProducerId)
		await socket.emit("create-webrtc-transport", { consumer: true, roomName: parameter.roomName }, ({ params }) => {
			parameter.consumerTransport = parameter.device.createRecvTransport(params)

			parameter.consumerTransport.on("connect", async ({ dtlsParameters }, callback, errback) => {
				try {
					await socket.emit("transport-recv-connect", { dtlsParameters, serverConsumerTransportId: params.id })
					callback()
				} catch (error) {
					errback(error)
				}
			})
			parameter.consumerTransport.on("connectionstatechange", async (e) => {
				console.log("- Receiver Transport State : ", e)
			})
			connectRecvTransport({
				parameter,
				consumerTransport: parameter.consumerTransport,
				socket,
				remoteProducerId,
				serverConsumerTransportId: params.id,
			})
		})
	} catch (error) {
		console.log("- Error Signaling New Consumer Transport : ", error)
	}
}

const connectRecvTransport = async ({ parameter, consumerTransport, socket, remoteProducerId, serverConsumerTransportId }) => {
	try {
		console.log(serverConsumerTransportId)
		await socket.emit(
			"consume",
			{
				rtpCapabilities: parameter.device.rtpCapabilities,
				remoteProducerId,
				serverConsumerTransportId,
				roomName: parameter.roomName,
			},
			async ({ params }) => {
				try {
					const consumer = await consumerTransport.consume({
						id: params.id,
						producerId: params.producerId,
						kind: params.kind,
						rtpParameters: params.rtpParameters,
					})

					let isUserExist = parameter.allUsers.find((data) => data.socketId == params.producerSocketOwner)
					const { track } = consumer

					if (isUserExist) {
						isUserExist[params.appData.label] = {
							track,
							isActive: params.appData.isActive,
							consumserId: consumer.id,
							producerId: remoteProducerId,
							transportId: consumerTransport.id,
						}
					} else {
						parameter.totalUsers++
						let data = {
							socketId: params.producerSocketOwner,
							picture: null,
						}
						data[params.appData.label] = {
							track,
							isActive: params.appData.isActive,
							consumserId: consumer.id,
							producerId: remoteProducerId,
							transportId: consumerTransport.id,
						}
						parameter.allUsers = [...parameter.allUsers, data]
					}

					console.log("- Params : ", parameter.allUsers)

					parameter.consumerTransports = [
						...parameter.consumerTransports,
						{
							consumer,
							consumerTransport,
							serverConsumerTransportId: params.id,
							producerId: remoteProducerId,
						},
					]

					console.log("- Total Users : ", parameter.totalUsers)

					createVideo({ id: params.producerSocketOwner, videoClassName: "user-video-container-1" })
					if (params.kind == "audio") {
						createAudio({ id: params.producerSocketOwner, track })
					}
					if (params.kind == "video") {
						insertVideo({ id: params.producerSocketOwner, track, pictures: "/assets/pictures/unknown.jpg" })
					}

					socket.emit("consumer-resume", { serverConsumerId: params.serverConsumerId })
				} catch (error) {
					console.log("- Error Consuming : ", error)
				}
			}
		)
	} catch (error) {
		console.log("- Error Connecting Receive Transport : ", error)
	}
}

module.exports = { createDevice, createSendTransport, signalNewConsumerTransport }
