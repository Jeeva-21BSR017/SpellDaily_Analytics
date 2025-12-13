function publishCompleted(testCode) {
    // http://127.0.0.1:5500/?code=tes989&source=twa
    const isTwa = new URLSearchParams(window.location.search).get("source") === "twa";
    if (isTwa && testCode) {
        if (typeof window.pushCompletedEvent === "function") {
            /// call this intent `spelldaily://test-completed?studentId=${studentId}&testCode=${testCode}`;
            window.location.href = `spelldaily://test-completed?testCode=${testCode}`;
        }
    }
}

function isTwa() {
    return new URLSearchParams(window.location.search).get("source") === "twa";
}

window.publishCompleted = publishCompleted;

window.isTwa = isTwa;