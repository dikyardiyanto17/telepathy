const { getMyStream, getRoomId, joinRoom } = require("../room/function/initialization")
const { signalNewConsumerTransport } = require("../room/function/mediasoup")
const { Parameters } = require("../room/function/parameter")
const { createMyVideo, removeVideoAndAudio } = require("../room/ui/video")

let parameter

const socket = io("/")

socket.on("connection-success", async ({ socketId }) => {
	console.log("- Id : ", socketId)
	parameter = new Parameters()
	parameter.username = "Diky"
	parameter.socketId = socketId
	parameter.isVideo = true
	parameter.isAudio = true
	await getRoomId(parameter)
	await getMyStream(parameter)
	await createMyVideo(parameter)
	await joinRoom({ socket, parameter })
	// console.log("- Parameter : ", parameter)
})

socket.on("new-producer", ({ producerId, socketId }) => {
	try {
		signalNewConsumerTransport({ remoteProducerId: producerId, socket, parameter, socketId })
	} catch (error) {
		console.log("- Error Receiving New Producer : ", error)
	}
})

socket.on("producer-closed", ({ remoteProducerId, socketId }) => {
	const producerToClose = parameter.consumerTransports.find((transportData) => transportData.producerId === remoteProducerId)
	// producerToClose.consumerTransport.close()
	producerToClose.consumer.close()

	let checkData = parameter.allUsers.find((data) => data.socketId === socketId)

	let kind

	for (const key in checkData) {
		if (typeof checkData[key] == "object" && checkData[key]) {
			if (checkData[key].producerId == remoteProducerId) {
				kind = key
			}
		}
	}

	delete checkData[kind]

	if (!checkData.audio && !checkData.video) {
		parameter.allUsers = parameter.allUsers.filter((data) => data.socketId !== socketId)

		parameter.totalUsers--
		removeVideoAndAudio({ socketId })
	}

	console.log(parameter.totalUsers)
})

module.exports = { socket }
