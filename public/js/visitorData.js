(function () {
  function getCookie(name) {
    try {
      const match = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
      return match ? decodeURIComponent(match[1]) : null;
    } catch (e) {
      return null;
    }
  }

  function setCookie(name, value, days) {
    try {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      document.cookie =
        name +
        "=" +
        encodeURIComponent(value) +
        "; expires=" +
        date.toUTCString() +
        "; path=/; SameSite=Lax";
    } catch (e) {}
  }

  function getOrCreateSessionId() {
    let sid = getCookie("v_sid");
    if (sid) {
      try {
        localStorage.setItem("v_sid", sid);
      } catch (e) {}
      return sid;
    }

    try {
      sid = localStorage.getItem("v_sid") || localStorage.getItem("sessionId");
    } catch (e) {}

    if (!sid) {
      sid = "vs_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    }

    try {
      localStorage.setItem("v_sid", sid);
      localStorage.setItem("sessionId", sid);
    } catch (e) {}
    setCookie("v_sid", sid, 365);
    return sid;
  }

  function sendVisitorData() {
    try {
      const sid = getOrCreateSessionId();

      const screenWidth = window.screen ? window.screen.width : null;
      const screenHeight = window.screen ? window.screen.height : null;
      const viewportWidth = window.innerWidth || null;
      const viewportHeight = window.innerHeight || null;
      const connectionType =
        navigator.connection && navigator.connection.effectiveType
          ? navigator.connection.effectiveType
          : "";
      const cpuCores = navigator.hardwareConcurrency || null;
      const deviceMemory = navigator.deviceMemory || null;
      const referer = document.referrer || "";
      const path = window.location.pathname + window.location.search;

      const payload = {
        sessionId: sid,
        screenWidth: screenWidth,
        screenHeight: screenHeight,
        viewportWidth: viewportWidth,
        viewportHeight: viewportHeight,
        connectionType: connectionType,
        cpuCores: cpuCores,
        deviceMemory: deviceMemory,
        referer: referer,
        path: path
      };

      if (typeof fetch === "function") {
        fetch("/ping", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-session-id": sid
          },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function () {});
      } else if (navigator.sendBeacon) {
        navigator.sendBeacon("/ping", JSON.stringify(payload));
      }
    } catch (err) {
      // Fail silently without interrupting UI
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sendVisitorData);
  } else {
    sendVisitorData();
  }
})();
