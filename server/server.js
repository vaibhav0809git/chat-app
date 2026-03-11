const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")


const app = express()

// Configure CORS for production
const corsOptions = {
  origin: [
    "https://chat-app-chi-flame.vercel.app",
    "https://surva.vercel.app",
    "http://localhost:3000"
  ],
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
}

app.use(cors(corsOptions))
app.use(express.json())






// Cloudinary and Multer setup
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: "djp69lsst",
  api_key: "739175573624636",
  api_secret: "HJgM4oHdfs17NrDOKZmbI_Y3OZQ"
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "chat-images",
    allowed_formats: ["jpg", "png", "jpeg"]
  }
});

const upload = multer({ storage: storage });

// Image upload endpoint
app.post("/upload", upload.single("image"), (req, res) => {
  console.log("/upload endpoint called");
  console.log("Full file object:", JSON.stringify(req.file, null, 2));
  console.log("File keys:", req.file ? Object.keys(req.file) : "NO FILE");
  
  if (!req.file) {
    console.error("No file uploaded");
    return res.status(400).json({ error: "No file uploaded" });
  }
  
  // Log all properties to find the URL
  for (let [key, value] of Object.entries(req.file)) {
    console.log(`  ${key}:`, value);
  }
  
  // Try multiple possible property names
  const imageUrl = req.file.path || req.file.secure_url || req.file.url || req.file.publicUrl;
  
  console.log("Extracted imageUrl:", imageUrl);
  
  if (!imageUrl) {
    console.error("Could not extract image URL. File object:", req.file);
    return res.status(500).json({ 
      error: "Could not extract image URL from Cloudinary response",
      fileKeys: Object.keys(req.file),
      file: req.file 
    });
  }
  
  res.json({ imageUrl });
});

// const server = http.createServer(app)

// const io = new Server(server,{
//   cors:{origin:"*"}
// })


const server = http.createServer(app)

const io = new Server(server,{
  cors:{
    origin:[
      "https://chat-app-chi-flame.vercel.app",
      "https://surva.vercel.app"
    ],
    methods:["GET","POST"]
  }
})

/* Test Route */
app.get("/", (req, res) => {
  res.json({message: "SurVa Chat Server is running"})
})

/* MongoDB Connection */

mongoose.connect("mongodb+srv://SurVa:SurVa%40123@cluster0.kbps6dl.mongodb.net/chat")

mongoose.connection.on("connected",()=>{
  console.log("MongoDB connected")
})

/* Models */

const User = mongoose.model("User",{
  username:String,
  password:String,
  createdAt: {type: Date, default: Date.now}
})

const Message = mongoose.model("Message",{
  sender:String,
  receiver:String,
  text:String,
  image:String,
  time:Date
})

const ChatRequest = mongoose.model("ChatRequest",{
  from:String,
  to:String,
  status: {type: String, enum: ["pending", "accepted", "rejected"], default: "pending"},
  createdAt: {type: Date, default: Date.now}
})

/* Generate Unique Username */

function generateUniqueUsername(baseUsername){
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `${baseUsername}_${timestamp}${random}`
}

/* Signup */

app.post("/signup", async(req,res)=>{

const {username,password}=req.body

const hashedPassword=await bcrypt.hash(password,10)

const uniqueUsername = generateUniqueUsername(username)

const user=new User({
username: uniqueUsername,
password:hashedPassword
})

await user.save()

res.json({message:"User created", username: uniqueUsername})

})

/* Login */

app.post("/login", async(req,res)=>{

const {username,password}=req.body

const user=await User.findOne({username})

if(!user){
return res.json({message:"User not found"})
}

const valid=await bcrypt.compare(password,user.password)

if(!valid){
return res.json({message:"Wrong password"})
}

const token=jwt.sign({username},"secret")

res.json({token,username})

})

/* Get Users */

app.get("/users", async(req,res)=>{

const users=await User.find({}, {password:0})

res.json(users)

})

/* Get All Users (Debug) */

app.get("/all-users", async(req,res)=>{
  try {
    const users = await User.find({}, {password: 0}).limit(20)
    console.log("All users count:", users.length)
    res.json(users)
  } catch(error) {
    console.error("Error fetching users:", error)
    res.status(500).json({error: error.message})
  }
})

/* Get Messages */

app.get("/messages/:user1/:user2", async(req,res)=>{

const {user1,user2}=req.params

const messages=await Message.find({
$or:[
{sender:user1,receiver:user2},
{sender:user2,receiver:user1}
]
}).sort({time:1})

res.json(messages)

})

/* Search Users */

/* Search Users */

app.get("/search-user/:username", async(req,res)=>{
  try {
    const searchTerm = req.params.username
    const currentUser = req.query.currentUser

    if(!searchTerm) {
      return res.status(400).json({error: "Search term required"})
    }

    console.log("Search request - term:", searchTerm, "current user:", currentUser)

    const users = await User.find(
      {
        $and: [
          {username: {$regex: searchTerm, $options: "i"}},
          {username: {$ne: currentUser}}
        ]
      },
      {password: 0}
    ).limit(10)

    console.log("Search results count:", users.length)
    res.json(users)
  } catch(error) {
    console.error("Search error:", error)
    res.status(500).json({error: error.message})
  }
})

/* Send Chat Request */

app.post("/send-request", async(req,res)=>{
  const {from, to} = req.body

  const existing = await ChatRequest.findOne({
    $or: [
      {from, to},
      {from: to, to: from}
    ]
  })

  if(existing){
    return res.json({message: "Request already exists"})
  }

  const request = new ChatRequest({from, to, status: "pending"})
  await request.save()

  res.json({message: "Request sent", request})
})

/* Get Chat Requests */

app.get("/chat-requests/:user", async(req,res)=>{
  const user = req.params.user

  const requests = await ChatRequest.find({to: user, status: "pending"}).sort({createdAt: -1})

  res.json(requests)
})

/* Accept Chat Request */

app.post("/accept-request", async(req,res)=>{
  const {from, to} = req.body

  const request = await ChatRequest.findOneAndUpdate(
    {from, to, status: "pending"},
    {status: "accepted"},
    {new: true}
  )

  if(!request){
    return res.json({message: "Request not found"})
  }

  res.json({message: "Request accepted", request})
})

/* Reject Chat Request */

app.post("/reject-request", async(req,res)=>{
  const {from, to} = req.body

  const request = await ChatRequest.findOneAndUpdate(
    {from, to, status: "pending"},
    {status: "rejected"},
    {new: true}
  )

  if(!request){
    return res.json({message: "Request not found"})
  }

  res.json({message: "Request rejected"})
})

/* Get Friends (Accepted Requests) */

app.get("/friends/:user", async(req,res)=>{
  const user = req.params.user

  const friends = await ChatRequest.find({
    $or: [
      {from: user, status: "accepted"},
      {to: user, status: "accepted"}
    ]
  })

  const friendList = friends.map(f => f.from === user ? f.to : f.from)

  res.json(friendList)
})

/* Socket Chat */

io.on("connection",(socket)=>{

console.log("User connected")

socket.on("sendMessage", async(data)=>{

const msg = new Message({
sender: data.sender,
receiver: data.receiver,
text: data.text || "",
image: data.image || undefined,
time: new Date()
})

await msg.save()

io.emit("receiveMessage", msg)

})

})

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});



