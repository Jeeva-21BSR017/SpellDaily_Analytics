const getQuestionByTestCode = async (testCode) => {
  try {
    const url = `${BASE_URL}/game/v1/question/${testCode}`;
    const response = await fetch(url);
    if(!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  } catch (err) {
    console.log("Error fetching question by test code:", err);
    logError("Error fetching question by test code:", err);
  }
};

const pushQuestionByTestCode = async (testCode, question) => {
  try {
    const url = `${BASE_URL}/game/v1/question/${testCode}`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    };
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  } catch (err) {
    console.log('Error fetching question by test code:', err);
    logError('Error fetching question by test code:', err);
  }
};

window.pushQuestionByTestCode = pushQuestionByTestCode;
window.getQuestionByTestCode = getQuestionByTestCode;
