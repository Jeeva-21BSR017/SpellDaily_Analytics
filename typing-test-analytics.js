const submitTypingTestAnalytics = async (testCode, questionId, word, data) => {
  try {
    const url = `${BASE_URL}/game/v1/typing-activity/${testCode}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ questionId, word, data }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (err) {
    console.log("Error fetching question by test code:", err);
    logError("Error fetching question by test code:", err);
  }
};

const getTypingTestAnalytics = async (testCode) => {
  try {
    const url = `${BASE_URL}/game/v1/typing-activity/${testCode}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  } catch (err) {
    console.log("Error fetching question by test code:", err);
    logError("Error fetching question by test code:", err);
  }
};

window.getTypingTestAnalytics = getTypingTestAnalytics;
window.submitTypingTestAnalytics = submitTypingTestAnalytics;
