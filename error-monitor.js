const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const BASE_URL = isLocal
  ? "http://localhost:8000"
  : "https://api.spelldaily.com";

const logError = (error) => {
  const safeMessage =
    error?.message || error?.statusText || String(error);

  let safeStack = null;

  // Extract or reconstruct stack
  if (error?.stack) {
    safeStack = error.stack;
  } else {
    try {
      safeStack = new Error(safeMessage).stack;
    } catch (_) {
      safeStack = null;
    }
  }

  console.error("Error occurred:", safeMessage);

  if (isLocal) return;

  fetch(`${BASE_URL}/v1/on-call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: safeMessage,
      stack: safeStack,
      url: window.location.href,
      userAgent: navigator.userAgent,
    }),
  }).catch((err) => {
    console.error("Failed to send error report:", err);
  });
};


// Global JS errors
window.addEventListener("error", (event) => {
  logError({
    message: event.error?.message || String(event.error),
    stack: event.error?.stack || null,
  });
});

// Promise errors
window.addEventListener("unhandledrejection", (event) => {
  logError({
    message: event.reason?.message || String(event.reason),
    stack: event.reason?.stack || null,
  });
});

const originalFetch = window.fetch;

window.fetch = async (...args) => {
  const requestUrl =
    typeof args[0] === "string" ? args[0] : args[0].url || "";

  if (requestUrl.includes("/v1/on-call")) {
    return originalFetch(...args);
  }

  try {
    const response = await originalFetch(...args);

    if (!response.ok) {
      logError({
        message: `Fetch failed: ${response.status} ${response.statusText}`,
        stack: null,
        url: requestUrl,
      });
    }

    return response;
  } catch (err) {
    logError({
      message: err.message,
      stack: err.stack,
      url: requestUrl,
    });
    throw err;
  }
};

// Resource load errors
window.addEventListener(
  "error",
  (e) => {
    if (
      e.target instanceof HTMLImageElement ||
      e.target instanceof HTMLScriptElement ||
      e.target instanceof HTMLLinkElement
    ) {
      logError({
        message: "Resource load error",
        url: e.target.src || e.target.href,
      });
    }
  },
  true
);
