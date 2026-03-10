(function(){

function sendVisitorData(){

const headers={

"x-screen-width":screen.width,
"x-screen-height":screen.height,

"x-viewport-width":window.innerWidth,
"x-viewport-height":window.innerHeight,

"x-connection-type":navigator.connection?.effectiveType,

"x-cpu-cores":navigator.hardwareConcurrency,

"x-device-memory":navigator.deviceMemory,

"x-session-id":localStorage.sessionId || createSession()

}

fetch("/ping",{
method:"GET",
headers
})

}

function createSession(){

const id=Math.random().toString(36).substring(2)

localStorage.sessionId=id

return id

}

sendVisitorData()

})()