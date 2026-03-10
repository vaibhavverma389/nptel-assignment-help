const mongoose = require("mongoose")

const visitorLogSchema = new mongoose.Schema({

userId: mongoose.Schema.Types.ObjectId,
email: String,
role: String,

ip: { type: String, index:true },

country: String,
city: String,
region: String,
timezone: String,
lat: Number,
lon: Number,

path: String,
method: String,
statusCode: Number,
protocol: String,

responseTime: Number,

device: String,
browser: String,
os: String,

userAgent: String,

referer: String,
language: String,
encoding: String,

screenWidth: Number,
screenHeight: Number,
viewportWidth: Number,
viewportHeight: Number,

connectionType: String,
cpuCores: Number,
deviceMemory: Number,

sessionId: String,

visitedAt:{
type:Date,
default:Date.now,
index:true
}

})

module.exports = mongoose.model("VisitorLog",visitorLogSchema)