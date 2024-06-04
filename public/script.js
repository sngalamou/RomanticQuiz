document.addEventListener('DOMContentLoaded', () => {
  const quizContainer = document.getElementById('quiz');
  const questionElement = document.getElementById('question');
  const questionTypeElement = document.getElementById('question-type');
  const questionSourceElement = document.getElementById('question-source');
  const answerElements = document.querySelectorAll(".answer");
  const nameContainer = document.getElementById('name-container');
  const startButton = document.getElementById('start-button');
  const userNameInput = document.getElementById('user-name');
  const userGreeting = document.getElementById('user-greeting');
  const cookieConsent = document.getElementById('cookie-consent');
  const acceptCookiesButton = document.getElementById('accept-cookies');
  const denyCookiesButton = document.getElementById('deny-cookies');
  const prevButton = document.getElementById('prev');
  const nextButton = document.getElementById('next');
  const submitButton = document.getElementById('submit');
  const resultContainer = document.getElementById('result');
  const scoreElement = document.getElementById('score');
  const retakeButton = document.getElementById('retake-button');
  const compareButton = document.getElementById('compare-button');
  const comparisonContainer = document.getElementById('comparison');
  const comparisonResults = document.getElementById('comparison-results');
  const closeComparisonButton = document.getElementById('close-comparison');

  let currentQuestionIndex = 0;
  let userAnswers = [];
  let userName = '';
  let quizQuestions = [];

  function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
  }

  function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  function checkUser() {
    const name = getCookie('userName');
    if (name) {
      userName = name;
      userGreeting.innerText = `Welcome, ${userName}`;
      nameContainer.style.display = 'none';
      fetchQuizQuestions();
    } else {
      nameContainer.style.display = 'flex';
    }

    const cookieConsentValue = getCookie('cookieConsent');
    if (!cookieConsentValue) {
      cookieConsent.style.display = 'block';
    }
  }

  async function fetchQuizQuestions() {
    try {
      const response = await fetch('/quiz');
      const data = await response.json();
      quizQuestions = data;
      showQuestion();
      quizContainer.style.display = 'block';
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
    }
  }

  function showQuestion() {
    const questionData = quizQuestions[currentQuestionIndex];
    questionElement.innerText = questionData.question;
    questionTypeElement.innerText = `Type: ${questionData.type}`;
    questionSourceElement.innerText = `Source: ${questionData.source}`;

    ['a', 'b', 'c', 'd'].forEach((option, index) => {
      const optionElement = document.getElementById(option);
      const labelElement = document.getElementById(`${option}_text`);
      if (questionData.options[index]) {
        optionElement.parentElement.style.display = 'block';
        optionElement.value = questionData.options[index];
        labelElement.innerText = questionData.options[index];
        optionElement.checked = userAnswers[currentQuestionIndex] === questionData.options[index];
      } else {
        optionElement.parentElement.style.display = 'none';
      }
    });

    prevButton.style.display = currentQuestionIndex === 0 ? 'none' : 'block';
    nextButton.style.display = currentQuestionIndex < quizQuestions.length - 1 ? 'block' : 'none';
    submitButton.style.display = currentQuestionIndex === quizQuestions.length - 1 ? 'block' : 'none';
  }

  function getSelected() {
    let selectedAnswer;
    answerElements.forEach(answerElement => {
      if (answerElement.checked) {
        selectedAnswer = answerElement.value;
      }
    });
    return selectedAnswer;
  }

  async function showResult() {
    quizContainer.style.display = 'none';
    resultContainer.style.display = 'block';

    try {
      const response = await fetch('/submit-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: userName, answers: userAnswers })
      });
      const result = await response.json();
      scoreElement.innerText = `Score: ${result.score}`;
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  }

  startButton.addEventListener('click', () => {
    userName = userNameInput.value;
    if (userName) {
      setCookie('userName', userName, 30);
      nameContainer.style.display = 'none';
      userGreeting.innerText = `Welcome, ${userName}`;
      fetchQuizQuestions();
    } else {
      alert('Please enter your name.');
    }
  });

  acceptCookiesButton.addEventListener('click', () => {
    setCookie('cookieConsent', true, 30);
    cookieConsent.style.display = 'none';
    checkUser();
  });

  denyCookiesButton.addEventListener('click', () => {
    cookieConsent.style.display = 'none';
    checkUser();
  });

  nextButton.addEventListener('click', () => {
    const answer = getSelected();
    if (answer) {
      userAnswers[currentQuestionIndex] = answer;
      currentQuestionIndex++;
      showQuestion();
    } else {
      alert('Please select an answer before proceeding.');
    }
  });

  prevButton.addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      showQuestion();
    }
  });

  submitButton.addEventListener('click', () => {
    const answer = getSelected();
    if (answer) {
      userAnswers[currentQuestionIndex] = answer;
      showResult();
    } else {
      alert('Please select an answer before submitting.');
    }
  });

  retakeButton.addEventListener('click', () => {
    currentQuestionIndex = 0;
    userAnswers = [];
    resultContainer.style.display = 'none';
    fetchQuizQuestions();
  });

  compareButton.addEventListener('click', async () => {
    try {
      const response = await fetch('/results');
      const results = await response.json();
      comparisonResults.innerHTML = '';
      results.forEach((result, index) => {
        const resultDiv = document.createElement('div');
        resultDiv.classList.add('comparison-result');
        resultDiv.innerHTML = `<h4>Quiz ${index + 1} - ${result.userName}</h4><p>Score: ${result.score}</p>`;
        result.questions.forEach((question, qIndex) => {
          const answerDiv = document.createElement('div');
          answerDiv.innerHTML = `<p>Question ${qIndex + 1}: ${question.question}</p><p>Your Answer: ${result.answers[qIndex]}</p>`;
          resultDiv.appendChild(answerDiv);
        });
        comparisonResults.appendChild(resultDiv);
      });
      comparisonContainer.style.display = 'block';
    } catch (error) {
      console.error('Error fetching results:', error);
    }
  });

  closeComparisonButton.addEventListener('click', () => {
    comparisonContainer.style.display = 'none';
  });

  checkUser();
});
