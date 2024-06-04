const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());  // Use body-parser middleware

const folderPath = path.join(__dirname, 'json');  // Correct path to the JSON folder
const quizResults = []; // List to store all quiz results

class Question {
  constructor(question, options, answer, weight, qtype) {
    this.question = question;
    this.options = options;
    this.answer = answer;
    this.type = qtype;
    this.weight = weight;
  }
}

class Quiz {
  constructor(questions, score, makeup) {
    this.questions = questions;
    this.score = score;
    this.makeup = makeup;
  }
}

function readQuestionsFromFiles(directory) {
  const questions = {
    'True/False': [],
    'Multiple Choice': [],
    'Matrix Table': [],
    'Rank Order': []
  };

  const files = fs.readdirSync(directory);
  files.forEach(filename => {
    if (filename.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(path.join(directory, filename), 'utf8'));
      if (data['True/False Questions']) {
        data['True/False Questions'].forEach(q => {
          questions['True/False'].push(new Question(q.question, ['True', 'False'], q.answer, 1, 'True/False'));
        });
      } else if (data['Multiple Choice Questions']) {
        data['Multiple Choice Questions'].forEach(q => {
          questions['Multiple Choice'].push(new Question(q.question, q.responses || ['Option 1', 'Option 2', 'Option 3', 'Option 4'], q.answer, 1, 'Multiple Choice'));
        });
      } else if (data.questions) {
        data.questions.forEach(q => {
          if (q.type === 'Matrix Table') {
            questions['Matrix Table'].push(new Question(q.question, q.responses, q.answer, 1, 'Matrix Table'));
          } else if (q.type === 'Rank Order') {
            questions['Rank Order'].push(new Question(q.question, q.responses, q.answer, 1, 'Rank Order'));
          }
        });
      } else if (data['Matrix Order']) {
        data['Matrix Order'].forEach(q => {
          questions['Matrix Table'].push(new Question(q.question, q.responses, q.answer, 1, 'Matrix Table'));
        });
      } else if (data['Rank Order']) {
        data['Rank Order'].forEach(q => {
          questions['Rank Order'].push(new Question(q.question, q.responses, q.answer, 1, 'Rank Order'));
        });
      }
    }
  });

  return questions;
}

function generateQuiz(directory) {
  const allQuestions = readQuestionsFromFiles(directory);
  const quizQuestions = [];
  const makeup = {
    'True/False': 0,
    'Multiple Choice': 0,
    'Matrix Table': 0,
    'Rank Order': 0
  };

  Object.keys(allQuestions).forEach(qtype => {
    if (allQuestions[qtype].length > 0) {
      const question = allQuestions[qtype][Math.floor(Math.random() * allQuestions[qtype].length)];
      quizQuestions.push(question);
      makeup[qtype] += 1;
    }
  });

  while (quizQuestions.length < 10) {
    const qtype = Object.keys(allQuestions)[Math.floor(Math.random() * Object.keys(allQuestions).length)];
    if (allQuestions[qtype].length > 0) {
      const question = allQuestions[qtype][Math.floor(Math.random() * allQuestions[qtype].length)];
      quizQuestions.push(question);
      makeup[qtype] += 1;
    }
  }

  return new Quiz(quizQuestions, 0, makeup);
}

function gradeQuiz(answers, quizQuestions) {
  let score = 0;
  for (let i = 0; i < quizQuestions.length; i++) {
    if (answers[i] && answers[i] === quizQuestions[i].answer) {
      score++;
    }
  }
  return score;
}

app.use(express.static(path.join(__dirname, 'public')));  // Serve static files from 'public' folder

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/quiz', (req, res) => {
  try {
    const quiz = generateQuiz(folderPath);
    res.json(quiz.questions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

app.post('/quiz/:number', (req, res) => {
  const quizFile = path.join(__dirname, `quiz_${req.params.number}.json`);
  fs.writeFile(quizFile, JSON.stringify(req.body, null, 2), 'utf8', err => {
    if (err) {
      res.status(500).json({ error: 'Failed to update quiz' });
    } else {
      res.json({ message: 'Quiz updated successfully' });
    }
  });
});

app.post('/submit-quiz', (req, res) => {
  const { name, answers } = req.body;
  const quiz = generateQuiz(folderPath);
  const score = gradeQuiz(answers, quiz.questions);
  quizResults.push({ quizName: 'Romantic Quiz', score, userName: name });
  res.json({ message: 'Quiz submitted successfully', score });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
