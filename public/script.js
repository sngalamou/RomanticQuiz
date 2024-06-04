let currentQuestionIndex = 0;
let quizQuestions = [];
let userAnswers = [];
let userName = '';

async function fetchQuizQuestions() {
  try {
    const response = await fetch('/quiz');
    quizQuestions = await response.json();
    document.getElementById('quiz-container').style.display = 'block';
    showQuestion();
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
  }
}

function showQuestion() {
  if (currentQuestionIndex >= quizQuestions.length) {
    showResult();
    return;
  }

  const questionData = quizQuestions[currentQuestionIndex];
  document.getElementById('question').innerText = questionData.question;

  const optionsContainer = document.getElementById('options');
  optionsContainer.innerHTML = '';

  questionData.options.forEach(option => {
    const optionElement = document.createElement('button');
    optionElement.innerText = option;
    optionElement.className = 'option';
    optionElement.addEventListener('click', () => selectOption(option));
    optionsContainer.appendChild(optionElement);
  });
}

function selectOption(selectedOption) {
  userAnswers[currentQuestionIndex] = selectedOption;
  currentQuestionIndex++;
  showQuestion();
}

async function showResult() {
  document.getElementById('quiz-container').style.display = 'none';
  document.getElementById('result').style.display = 'block';

  const response = await fetch('/submit-quiz', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: userName, answers: userAnswers })
  });
  const result = await response.json();
  document.getElementById('score').innerText = `Score: ${result.score}`;
}

document.getElementById('start-button').addEventListener('click', () => {
  userName = document.getElementById('user-name').value;
  if (userName) {
    document.getElementById('name-container').style.display = 'none';
    fetchQuizQuestions();
  } else {
    alert('Please enter your name.');
  }
});

document.getElementById('next-button').addEventListener('click', showQuestion);
