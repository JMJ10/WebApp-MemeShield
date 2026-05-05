const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

const upload = multer({dest:'uploads/'});

// 🔴 REPLACE WITH YOUR HF SPACE
const MODEL_API = "https://JMJ10-MemeShield-ML-Model-API.hf.space/predict";

const users = new Map();

// CHAT
io.on("connection", (socket)=>{
  socket.on("message",(data)=>{
    const username = users.get(socket.id) || "User";
    io.emit("message",{username, message:data.message});
  });

  socket.on("user-join",(u)=> users.set(socket.id,u));

  socket.on("image-upload", async (data)=>{
    try{
      const form = new FormData();
      form.append("image", fs.createReadStream("." + data.imageUrl));

      const res = await axios.post(MODEL_API, form, {
        headers: form.getHeaders()
      });

      io.emit("message",{
        type:"image",
        imageUrl:data.imageUrl,
        analysis:res.data
      });

    }catch(err){
      console.log(err.message);
    }
  });
});

// UPLOAD ROUTE
app.post("/upload", upload.single("image"), (req,res)=>{
  res.json({imageUrl:"/uploads/"+req.file.filename});
});

// DIRECT ANALYSIS (UPLOAD PAGE)
app.post("/analyze", async (req,res)=>{
  try{
    const imgPath = "." + req.body.imageUrl;

    const form = new FormData();
    form.append("image", fs.createReadStream(imgPath));

    const response = await axios.post(MODEL_API, form, {
      headers: form.getHeaders()
    });

    res.json(response.data);

  }catch(err){
    res.status(500).json({error:"Model failed"});
  }
});

server.listen(3000, ()=>console.log("Running on 3000"));