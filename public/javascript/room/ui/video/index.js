const createMyVideo = async (parameter) => {
	try {
		let videoContainer = document.getElementById("video-container")
		let userVideoContainer = document.createElement("div")
		userVideoContainer.id = "vc-" + parameter.socketId
		userVideoContainer.className = "user-video-container-1"
		userVideoContainer.innerHTML = `<video id="v-${parameter.socketId}" muted autoplay class="user-video"></video>`
		// let userVideo = document.createElement("video")
		// userVideo.id = "v-" + parameter.socketId
		// userVideo.className = "user-video"
		// userVideo.setAttribute("autoplay", true)
		// userVideo.setAttribute("muted", true)
		// userVideo.srcObject = parameter.localStream
		// userVideoContainer.appendChild(userVideo)
		videoContainer.appendChild(userVideoContainer)
		document.getElementById(`v-${parameter.socketId}`).srcObject = parameter.localStream
	} catch (error) {
		console.log("- Error Creating Video : ", error)
	}
}

const createVideo = ({ id, videoClassName }) => {
	try {
		let isVideoExist = document.getElementById("vc-" + id)
		if (!isVideoExist) {
			let videoContainer = document.getElementById("video-container")
			let userVideoContainer = document.createElement("div")
			userVideoContainer.id = "vc-" + id
			userVideoContainer.className = videoClassName
			userVideoContainer.innerHTML = `<video id="v-${id}" class="user-video" poster="/assets/pictures/unknown.jpg" autoplay></video>`
			// let userVideo = document.createElement("video")
			// userVideo.id = "v-" + id
			// userVideo.className = "user-video"
			// userVideo.setAttribute("autoplay", true)
			// userVideo.setAttribute("muted", true)
			// userVideoContainer.appendChild(userVideo)
			videoContainer.appendChild(userVideoContainer)
			// console.log("- Video : ", document.getElementById("v-" + id))
		}
	} catch (error) {
		console.log("- Error Creating User Video : ", error)
	}
}

const createAudio = ({ id, track }) => {
	try {
		let checkAudio = document.getElementById(`ac-${id}`)
		if (!checkAudio) {
			let audioContainer = document.getElementById("audio-collection")
			const newElem = document.createElement("div")
			newElem.id = `ac-${id}`
			newElem.innerHTML = `<audio id="a-${id}" autoplay></audio>`
			// let audio = document.createElement("audio")
			// audio.id = `a-${id}`
			// audio.setAttribute("autoplay", true)
			// audio.srcObject = new MediaStream([track])
			// newElem.appendChild(audio)
			// newElem.srcObject = new MediaStream([track])
			audioContainer.appendChild(newElem)
			// console.log("- A", document.getElementById("a-" + id))
			document.getElementById("a-" + id).srcObject = new MediaStream([track])
		}
	} catch (error) {
		console.log("- Error Creating Audio : ", error)
	}
}

const insertVideo = ({ track, id }) => {
	try {
		document.getElementById("v-" + id).srcObject = new MediaStream([track])
	} catch (error) {
		console.log("- Error Inserting Video : ", error)
	}
}

const removeVideoAndAudio = ({ socketId }) => {
	try {
		const removeVideo = document.getElementById(`vc-${socketId}`)
		if (removeVideo) removeVideo.remove()
		const removeAudio = document.getElementById(`va-${socketId}`)
		if (removeAudio) removeAudio.remove()
	} catch (error) {
		console.log("- Error Removing Video / Audio : ", error)
	}
}

module.exports = { createMyVideo, createAudio, createVideo, insertVideo, removeVideoAndAudio }
