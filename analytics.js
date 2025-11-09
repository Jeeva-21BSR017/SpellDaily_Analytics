const eventTypes = {
  COMPLETED: "completed",
  STARTED: "started",
};

const makeFetch = (event, testCode) => {
  const url =
    event === eventTypes.STARTED
      ? `${BASE_URL}/v1/analytics/started`
      : `${BASE_URL}/v1/analytics/completed`;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ testCode }),
  };
  return fetch(url, options).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  });
};
const pushCompletedEvent = async (testCode) => {
  try {
    await makeFetch(eventTypes.COMPLETED, testCode);
  } catch (err) {
    console.error("Error pushing completed event:", err);
  }
};

const pushStartedEvent = async (testCode) => {
  try {
    await makeFetch(eventTypes.STARTED, testCode);
  } catch (err) {
    console.error("Error pushing started event:", err);
  }
};


window.pushCompletedEvent = pushCompletedEvent;
window.pushStartedEvent = pushStartedEvent;