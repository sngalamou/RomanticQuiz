document.addEventListener('DOMContentLoaded', () => {
  fetch('/quiz')
    .then(response => response.json())
    .then(data => {
      displayQuiz(data);
    })
    .catch(error => {
      console.error('Error fetching quiz:', error);
      alert('Failed to load quiz.');
    });

  document.getElementById('submit-button').addEventListener('click', submitQuiz);
});

function displayQuiz(questions) {
  const quizContainer = document.getElementById('quiz-container');
  quizContainer.innerHTML = '';

  questions.forEach((question, index) => {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question';

    let optionsHtml = '';
    if (question.type === 'True/False' || question.type === 'Multiple Choice') {
      optionsHtml = question.options.map((option, i) => `
        <label class="option">
          <input type="radio" name="question-${index}" value="${option}">
          ${option}
        </label>
      `).join('');
    } else if (question.type === 'Matrix Table' || question.type === 'Rank Order') {
      optionsHtml = question.options.map((option, i) => `
        <label class="option">
          <input type="checkbox" name="question-${index}" value="${option}">
          ${option}
        </label>
      `).join('');
    }

    questionDiv.innerHTML = `
      <h2>${question.question}</h2>
      <div class="options">${optionsHtml}</div>
    `;

    quizContainer.appendChild(questionDiv);
  });
}

function submitQuiz() {
  const quizContainer = document.getElementById('quiz-container');
  const questions = quizContainer.querySelectorAll('.question');
  let score = 0;
  const answers = [];

  questions.forEach((questionDiv, index) => {
    const selectedOption = questionDiv.querySelector('input:checked');
    if (selectedOption) {
      answers.push(selectedOption.value);
      if (selectedOption.value === "True") {
        score++;
      }
    }
  });

  document.getElementById('score-container').innerText = `Your score is: ${score} out of 10`;

  fetch('/quiz/1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ answers, score })
  })
  .then(response => response.json())
  .then(data => {
    alert(data.message);
  })
  .catch(error => {
    console.error('Error submitting quiz:', error);
    alert('Failed to submit quiz.');
  });
}