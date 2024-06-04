const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const winston = require('winston');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());
app.use(helmet());
app.use(cors());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

const folderPath = path.join(__dirname, 'json');
const quizResults = [];

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

class Question {
  constructor(question, options, answer, weight, qtype, source) {
    this.question = question;
    this.options = options;
    this.answer = answer;
    this.weight = weight;
    this.type = qtype;
    this.source = source;
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
    'Rank Order': [],
    'Likert Scale': [],
    'Matrix Order': [],
    'Rating Scale': [],
    'Yes or No': []
  };

  const files = fs.readdirSync(directory);
  files.forEach(filename => {
    if (filename.endsWith('.json')) {
      const data = JSON.parse(fs.readFileSync(path.join(directory, filename), 'utf8'));
      const qtype = filename.split('.')[0];
      if (data[qtype]) {
        data[qtype].forEach(q => {
          questions[qtype].push(new Question(q.question, q.responses || ['Option 1', 'Option 2', 'Option 3', 'Option 4'], q.answer, q.weight || 1, qtype, filename));
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
    'Rank Order': 0,
    'Likert Scale': 0,
    'Matrix Order': 0,
    'Rating Scale': 0,
    'Yes or No': 0
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
  let loveLanguage = '';
  let romanticType = '';
  const loveLanguageScores = {
    'Words of Affirmation': 0,
    'Acts of Service': 0,
    'Receiving Gifts': 0,
    'Quality Time': 0,
    'Physical Touch': 0
  };

  quizQuestions.forEach((question, index) => {
    if (answers[index] && answers[index] === question.answer) {
      score += question.weight;
      loveLanguageScores[question.type] += question.weight;
    }
  });

  const maxLoveLanguageScore = Math.max(...Object.values(loveLanguageScores));
  loveLanguage = Object.keys(loveLanguageScores).find(key => loveLanguageScores[key] === maxLoveLanguageScore);

  if (score >= 90) {
    romanticType = 'Hopeless Romantic';
  } else if (score >= 70) {
    romanticType = 'Realistic Romantic';
  } else if (score >= 50) {
    romanticType = 'Skeptical Romantic';
  } else {
    romanticType = 'Non-Romantic';
  }

  return { score, loveLanguage, romanticType };
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/quiz', (req, res) => {
  try {
    const quiz = generateQuiz(folderPath);
    res.json(quiz.questions);
  } catch (error) {
    logger.error('Error generating quiz:', error.stack);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

app.post('/quiz/:number', [
  body('question').notEmpty().withMessage('Question is required'),
  body('options').isArray({ min: 1 }).withMessage('Options must be an array with at least one element'),
  body('answer').notEmpty().withMessage('Answer is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const quizFile = path.join(__dirname, `quiz_${req.params.number}.json`);
  fs.writeFile(quizFile, JSON.stringify(req.body, null, 2), 'utf8', err => {
    if (err) {
      logger.error('Error updating quiz:', err.stack);
      res.status(500).json({ error: 'Failed to update quiz' });
    } else {
      res.json({ message: 'Quiz updated successfully' });
    }
  });
});

app.post('/submit-quiz', [
  body('name').notEmpty().withMessage('Name is required'),
  body('answers').isArray().withMessage('Answers must be an array')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, answers } = req.body;
  const quiz = generateQuiz(folderPath);
  const result = gradeQuiz(answers, quiz.questions);
  quizResults.push({ quizName: 'Romantic Quiz', score: result.score, loveLanguage: result.loveLanguage, romanticType: result.romanticType, userName: name, questions: quiz.questions, answers });
  res.cookie('quizResults', JSON.stringify(quizResults), { maxAge: 900000, httpOnly: true });
  res.json({ message: 'Quiz submitted successfully', score: result.score, loveLanguage: result.loveLanguage, romanticType: result.romanticType });
});

app.get('/results', (req, res) => {
  try {
    const results = req.cookies.quizResults ? JSON.parse(req.cookies.quizResults) : [];
    res.json(results);
  } catch (error) {
    logger.error('Error retrieving results:', error.stack);
    res.status(500).json({ error: 'Failed to retrieve results' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
