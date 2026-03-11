const socket = io("http://localhost:3000")

const sender = localStorage.getItem("username")
const urlParams = new URLSearchParams(window.location.search)
const receiver = urlParams.get("user")

if(!sender || !receiver){
  window.location = "users.html"
}

document.getElementById("chatWith").innerText = "Chat with " + receiver

/* Check if users are friends */

async function checkIfFriends(){
  const res = await fetch("http://localhost:3000/friends/" + sender)
  const friends = await res.json()

  if(!friends.includes(receiver)){
    alert("You need to accept the chat request first")
    window.location = "users.html"
  }
}

/* Load previous messages */

async function loadMessages(){
  await checkIfFriends()

  const res = await fetch("http://localhost:3000/messages/" + sender + "/" + receiver)
  const messages = await res.json()

  messages.forEach(showMessage)
}

/* Show message */

function showMessage(data){

  const div = document.createElement("div")
  div.className = data.sender === sender ? "message own" : "message other"

  const bubble = document.createElement("div")
  bubble.className = "message-bubble"

  const time = data.time 
  ? new Date(data.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})
  : ""

  /* If message has image */

  if(data.image){

    bubble.innerHTML = `
    <strong>${data.sender}</strong><br>
    <img src="${data.image}" style="max-width:200px;border-radius:8px;cursor:pointer" onclick="openLightbox('${data.image}')" alt="chat image"><br>
    <small>${time}</small>
    `

  }else{

    bubble.innerHTML = `
    <strong>${data.sender}</strong><br>
    ${data.text}<br>
    <small>${time}</small>
    `
  }

  div.appendChild(bubble)

  const messages = document.getElementById("messages")
  messages.appendChild(div)
  messages.scrollTop = messages.scrollHeight
}

/* Send text message */

function send(){

  const text = document.getElementById("msg").value

  if(!text.trim()) return

  const message = {
    sender,
    receiver,
    text,
    time:new Date()
  }

  socket.emit("sendMessage",message)

  document.getElementById("msg").value=""
}

/* Receive message */

socket.on("receiveMessage",(data)=>{

  if(
    (data.sender === sender && data.receiver === receiver) ||
    (data.sender === receiver && data.receiver === sender)
  ){
    showMessage(data)
  }

})

/* IMAGE UPLOAD (📎 button) */

const imageInput = document.getElementById("imageInput")

if(imageInput){


imageInput.addEventListener("change", async ()=>{
  const file = imageInput.files[0]
  if(!file) {
    console.log("No file selected")
    return
  }

  console.log("File selected:", file.name, file.size, file.type)

  const formData = new FormData()
  formData.append("image", file)

  try {
    console.log("Uploading image to server...")
    const res = await fetch("http://localhost:3000/upload",{
      method: "POST",
      body: formData
    })

    console.log("Upload response status:", res.status)

    if (!res.ok) {
      const errorText = await res.text()
      console.error("Server error response:", errorText)
      alert("Image upload failed. Server error: " + res.status)
      return
    }

    const data = await res.json()
    console.log("Upload response:", data)

    if (!data.imageUrl) {
      console.error("No imageUrl in response")
      alert("Image upload failed. No imageUrl returned.")
      return
    }

    console.log("Image uploaded successfully:", data.imageUrl)
    const message = {
      sender,
      receiver,
      image: data.imageUrl,
      time: new Date()
    }
    socket.emit("sendMessage", message)
    
    // Reset file input
    imageInput.value = ""
  } catch (err) {
    alert("Image upload failed: " + err.message)
    console.error("Image upload error", err)
  }
})

}

/* Lightbox Functions */
let currentZoom = 1;

function openLightbox(imageSrc) {
  const lightbox = document.getElementById("imageLightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  lightboxImage.src = imageSrc;
  lightbox.classList.add("active");
  currentZoom = 1;
  lightboxImage.style.transform = "scale(1)";
}

function closeLightbox() {
  const lightbox = document.getElementById("imageLightbox");
  lightbox.classList.remove("active");
  currentZoom = 1;
}

function zoomIn(event) {
  event.stopPropagation();
  currentZoom += 0.2;
  const lightboxImage = document.getElementById("lightboxImage");
  lightboxImage.style.transform = `scale(${currentZoom})`;
}

function zoomOut(event) {
  event.stopPropagation();
  if (currentZoom > 0.5) {
    currentZoom -= 0.2;
    const lightboxImage = document.getElementById("lightboxImage");
    lightboxImage.style.transform = `scale(${currentZoom})`;
  }
}

function resetZoom(event) {
  event.stopPropagation();
  currentZoom = 1;
  const lightboxImage = document.getElementById("lightboxImage");
  lightboxImage.style.transform = "scale(1)";
}

loadMessages()