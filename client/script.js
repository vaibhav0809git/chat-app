const socket = io("https://chat-app-qvx0.onrender.com")

const username = localStorage.getItem("username")

function send(){

const msg = document.getElementById("msg").value

socket.emit("sendMessage",{
user:username,
text:msg,
time:new Date()
})

document.getElementById("msg").value=""

}

socket.on("receiveMessage",(data)=>{

const div=document.createElement("div")

div.innerText=data.user+": "+data.text

document.getElementById("messages").appendChild(div)

})