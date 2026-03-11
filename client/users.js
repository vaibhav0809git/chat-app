const currentUser = localStorage.getItem("username")

if(!currentUser){
  window.location = "login.html"
}

// Display current user's username
document.getElementById("userDisplay").innerText = currentUser

function copyUsername(){
  navigator.clipboard.writeText(currentUser)
  alert("Username copied to clipboard!")
}

function switchTab(tabName){
  document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"))
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"))
  
  document.getElementById(tabName).classList.add("active")
  event.target.classList.add("active")

  if(tabName === "requests"){
    loadRequests()
  } else if(tabName === "chats"){
    loadChats()
  }
}

async function loadChats(){
  const res = await fetch("https://chat-app-qvx0.onrender.com/friends/" + currentUser)
  const friends = await res.json()

  const chatsList = document.getElementById("chatsList")
  chatsList.innerHTML = ""

  if(friends.length === 0){
    chatsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💬</div><p>No chats yet. Find friends to start chatting!</p></div>'
    return
  }

  friends.forEach(friend => {
    const div = document.createElement("div")
    div.className = "user-item"
    div.innerHTML = `<span>${friend}</span><span class="arrow">→</span>`
    div.onclick = () => {
      window.location = "chat.html?user=" + friend
    }
    chatsList.appendChild(div)
  })
}

async function loadRequests(){
  const res = await fetch("https://chat-app-qvx0.onrender.com/chat-requests/" + currentUser)
  const requests = await res.json()

  const requestsList = document.getElementById("requestsList")
  requestsList.innerHTML = ""

  if(requests.length === 0){
    requestsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📬</div><p>No pending requests</p></div>'
    return
  }

  requests.forEach(req => {
    const div = document.createElement("div")
    div.className = "request-item"
    div.innerHTML = `
      <div class="request-info">
        <div class="username">${req.from}</div>
        <div class="status">wants to chat with you</div>
      </div>
      <div class="request-actions">
        <button class="accept-btn" onclick="acceptRequest('${req.from}', '${currentUser}')">Accept</button>
        <button class="reject-btn" onclick="rejectRequest('${req.from}', '${currentUser}')">Reject</button>
      </div>
    `
    requestsList.appendChild(div)
  })
}

async function searchUsers(){
  const searchTerm = document.getElementById("searchInput").value.trim()
  
  if(!searchTerm){
    alert("Please enter a username to search")
    return
  }

  try {
    console.log("Searching for:", searchTerm, "Current user:", currentUser)
    const searchURL = `https://chat-app-qvx0.onrender.com/search-user/${encodeURIComponent(searchTerm)}?currentUser=${encodeURIComponent(currentUser)}`
    console.log("Request URL:", searchURL)
    
    const res = await fetch(searchURL)
    
    console.log("Response status:", res.status)
    
    if(res.status === 404) {
      console.error("404 - Endpoint not found")
      alert("Server error: Search endpoint not found (404)")
      return
    }
    
    if(!res.ok) {
      throw new Error(`Server error: ${res.status} ${res.statusText}`)
    }
    
    const users = await res.json()
    console.log("Search results:", users)

    const searchResults = document.getElementById("searchResults")
    searchResults.innerHTML = ""

    if(!users || users.length === 0){
      searchResults.innerHTML = '<div class="empty-state"><p>No users found matching "' + searchTerm + '"</p></div>'
      return
    }

    searchResults.innerHTML = `<p style="color: #65676b; font-size: 12px; margin-bottom: 10px;">Found ${users.length} user(s):</p>`

    users.forEach(user => {
      const div = document.createElement("div")
      div.className = "user-item"
      div.innerHTML = `
        <span>${user.username}</span>
        <button class="btn btn-info" style="width: auto; padding: 8px 16px; font-size: 12px;" onclick="sendRequest('${user.username}', this)" data-user="${user.username}">Send Request</button>
      `
      searchResults.appendChild(div)
    })
  } catch(error) {
    console.error("Search error:", error)
    alert("Error: " + error.message)
  }
}

async function showAllUsers(){
  try {
    console.log("Fetching all users...")
    const res = await fetch("https://chat-app-qvx0.onrender.com/all-users")
    
    if(!res.ok) {
      throw new Error(`Server error: ${res.status}`)
    }
    
    const users = await res.json()
    console.log("All users:", users)

    const searchResults = document.getElementById("searchResults")
    searchResults.innerHTML = ""

    if(!users || users.length === 0){
      searchResults.innerHTML = '<div class="empty-state"><p>No users in database</p></div>'
      return
    }

    searchResults.innerHTML = `<p style="color: #65676b; font-size: 12px; margin-bottom: 10px;">Found ${users.length} users in database:</p>`

    users.forEach(user => {
      if(user.username !== currentUser){
        const div = document.createElement("div")
        div.className = "user-item"
        div.innerHTML = `
          <span>${user.username}</span>
          <button class="btn btn-info" style="width: auto; padding: 8px 16px; font-size: 12px;" onclick="sendRequest('${user.username}')">Send Request</button>
        `
        searchResults.appendChild(div)
      }
    })
  } catch(error) {
    console.error("Error fetching all users:", error)
    alert("Error fetching users: " + error.message)
  }
}

async function sendRequest(toUser){
  const res = await fetch("https://chat-app-qvx0.onrender.com/send-request", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({from: currentUser, to: toUser})
  })

  const data = await res.json()
  alert(data.message)
  
  if(data.request){
    searchUsers()
  }
}

async function acceptRequest(from, to){
  const res = await fetch("https://chat-app-qvx0.onrender.com/accept-request", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({from, to})
  })

  const data = await res.json()
  alert(data.message)
  loadRequests()
  loadChats()
}

async function rejectRequest(from, to){
  const res = await fetch("https://chat-app-qvx0.onrender.com/reject-request", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({from, to})
  })

  const data = await res.json()
  alert(data.message)
  loadRequests()
}

function logout(){
  localStorage.clear()
  window.location = "login.html"
}

loadChats()