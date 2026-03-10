const VisitorLog = require("../models/VisitorLog")
const geoip = require("geoip-lite")

function detectDevice(ua){
if(/mobile/i.test(ua)) return "Mobile"
if(/tablet/i.test(ua)) return "Tablet"
return "Desktop"
}

function detectBrowser(ua){
if(ua.includes("Chrome")) return "Chrome"
if(ua.includes("Firefox")) return "Firefox"
if(ua.includes("Safari") && !ua.includes("Chrome")) return "Safari"
if(ua.includes("Edge")) return "Edge"
return "Other"
}

function detectOS(ua){
if(ua.includes("Windows")) return "Windows"
if(ua.includes("Android")) return "Android"
if(ua.includes("iPhone") || ua.includes("iPad")) return "iOS"
if(ua.includes("Mac")) return "MacOS"
if(ua.includes("Linux")) return "Linux"
return "Other"
}

module.exports = (req,res,next)=>{

const startTime = Date.now()

let ip =
req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
req.socket.remoteAddress ||
req.ip

if(ip === "::1") ip="127.0.0.1"

const path = req.originalUrl

res.on("finish",()=>{

setImmediate(async()=>{

try{

if(!req.user) return
if(req.user.role==="admin") return

const ua=req.headers["user-agent"]||""

const geo=geoip.lookup(ip)

await VisitorLog.create({

userId:req.user._id,
email:req.user.email,
role:req.user.role,

ip,

country:geo?.country,
city:geo?.city,
region:geo?.region,
timezone:geo?.timezone,
lat:geo?.ll?.[0],
lon:geo?.ll?.[1],

path,
method:req.method,
protocol:req.protocol,

statusCode:res.statusCode,

responseTime:Date.now()-startTime,

device:detectDevice(ua),
browser:detectBrowser(ua),
os:detectOS(ua),

userAgent:ua,

referer:req.headers["referer"],
language:req.headers["accept-language"],
encoding:req.headers["accept-encoding"],

screenWidth:req.headers["x-screen-width"],
screenHeight:req.headers["x-screen-height"],
viewportWidth:req.headers["x-viewport-width"],
viewportHeight:req.headers["x-viewport-height"],

connectionType:req.headers["x-connection-type"],
cpuCores:req.headers["x-cpu-cores"],
deviceMemory:req.headers["x-device-memory"],

sessionId:req.headers["x-session-id"],

visitedAt:new Date()

})

}catch(e){
console.log("Visitor log error:",e.message)
}

})

})

next()

}