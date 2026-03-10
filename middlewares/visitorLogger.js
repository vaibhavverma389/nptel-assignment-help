const VisitorLog = require("../models/VisitorLog")
const geoip = require("geoip-lite")

function detectDevice(ua){
if(!ua) return "Unknown"

if(/mobile/i.test(ua)) return "Mobile"
if(/tablet/i.test(ua)) return "Tablet"

return "Desktop"
}

function detectBrowser(ua){
if(!ua) return "Unknown"

if(ua.includes("Chrome")) return "Chrome"
if(ua.includes("Firefox")) return "Firefox"
if(ua.includes("Safari") && !ua.includes("Chrome")) return "Safari"
if(ua.includes("Edge")) return "Edge"

return "Other"
}

function detectOS(ua){
if(!ua) return "Unknown"

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
req.headers["cf-connecting-ip"] ||
req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
req.socket.remoteAddress ||
req.ip

if(!ip) ip="0.0.0.0"

if(ip === "::1") ip="127.0.0.1"

if(ip.startsWith("::ffff:")){
ip = ip.replace("::ffff:","")
}

const path = req.originalUrl

res.on("finish",()=>{

setImmediate(async()=>{

try{

if(!req.user) return
if(req.user.role === "admin") return

const ua = req.headers["user-agent"] || ""

let geo = geoip.lookup(ip)

if(!geo && ip === "127.0.0.1"){
geo = geoip.lookup("8.8.8.8")
}

await VisitorLog.create({

userId:req.user._id,

email:req.user.email,

role:req.user.role,

ip,

country:geo?.country || "",

city:geo?.city || "",

region:geo?.region || "",

timezone:geo?.timezone || "",

lat:geo?.ll?.[0] || null,

lon:geo?.ll?.[1] || null,

path,

method:req.method,

protocol:req.protocol,

statusCode:res.statusCode,

responseTime:Date.now() - startTime,

device:detectDevice(ua),

browser:detectBrowser(ua),

os:detectOS(ua),

userAgent:ua,

referer:req.headers["referer"] || "",

language:req.headers["accept-language"] || "",

encoding:req.headers["accept-encoding"] || "",

screenWidth:req.headers["x-screen-width"] || null,

screenHeight:req.headers["x-screen-height"] || null,

viewportWidth:req.headers["x-viewport-width"] || null,

viewportHeight:req.headers["x-viewport-height"] || null,

connectionType:req.headers["x-connection-type"] || "",

cpuCores:req.headers["x-cpu-cores"] || null,

deviceMemory:req.headers["x-device-memory"] || null,

sessionId:req.headers["x-session-id"] || "",

visitedAt:new Date()

})

}catch(err){

console.log("Visitor log error:",err.message)

}

})

})

next()

}