import { useState } from 'react';
import type { Question } from '../types';
import './QuizScreen.css';

interface QuizScreenProps {
  question: Question;
  currentIndex: number;
  totalQuestions: number;
  onAnswer: (answerIndex: number) => void;
}

const iconRotationsDeg = [-12, 6, -4, 10, 2, -8, 14];

export default function QuizScreen({
  question,
  currentIndex,
  totalQuestions,
  onAnswer
}: QuizScreenProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleAnswerClick = (index: number) => {
    if (isAnimating) return;
    
    setSelectedAnswer(index);
    setIsAnimating(true);
    
    setTimeout(() => {
      onAnswer(index);
      setSelectedAnswer(null);
      setIsAnimating(false);
    }, 400);
  };

  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  return (
    <div className="quiz-screen" key={question.id}>
      <div className="quiz-card">
        {/* Progress Header */}
        <div className="quiz-header">
          <span className="progress-label">
            <img
              className="progress-logo"
              src="/Logo Long NEW.svg"
              alt="Sorting Hat"
            />
          </span>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="quiz-content">
          <h2 className="question-text">{question.text}</h2>

          {/* Answers */}
          <div className="answers-section">
            {question.answers.map((answer, index) => (
              <button
                key={index}
                className={`answer-button ${selectedAnswer === index ? 'selected' : ''}`}
                onClick={() => handleAnswerClick(index)}
                disabled={isAnimating}
              >
                <img
                  className="answer-emoji"
                  src="/icon_dot.svg"
                  alt=""
                  aria-hidden="true"
                  style={{
                    transform: `rotate(${iconRotationsDeg[index % iconRotationsDeg.length]}deg)`,
                    transformOrigin: '50% 50%'
                  }}
                />
                <span className="answer-text">{answer.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
