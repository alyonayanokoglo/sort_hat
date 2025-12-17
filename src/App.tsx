import { useState, useCallback } from 'react';
import type { GameScreen, QuizState, TrackId, Track } from './types';
import { questions } from './data/questions';
import { tracks } from './data/tracks';
import IntroScreen from './components/IntroScreen';
import QuizScreen from './components/QuizScreen';
import ResultScreen from './components/ResultScreen';
import './App.css';

const initialQuizState: QuizState = {
  currentQuestion: 0,
  scores: {
    gryffindor: 0,
    hufflepuff: 0,
    ravenclaw: 0,
    slytherin: 0,
    promptevrin: 0
  },
  answers: []
};

function App() {
  const [screen, setScreen] = useState<GameScreen>('intro');
  const [quizState, setQuizState] = useState<QuizState>(initialQuizState);
  const [resultTrack, setResultTrack] = useState<Track | null>(null);
  const handleStart = useCallback(() => {
    setScreen('quiz');
  }, []);

  const handleAnswer = useCallback((answerIndex: number) => {
    const currentQuestion = questions[quizState.currentQuestion];
    const selectedAnswer = currentQuestion.answers[answerIndex];
    
    const newScores = { ...quizState.scores };
    Object.entries(selectedAnswer.points).forEach(([trackId, points]) => {
      newScores[trackId as TrackId] += points as number;
    });

    const newAnswers = [...quizState.answers, answerIndex];
    
    if (quizState.currentQuestion >= questions.length - 1) {
      const maxScore = Math.max(...Object.values(newScores));
      const leadingTracks = (Object.entries(newScores) as [TrackId, number][])
        .filter(([, score]) => score === maxScore)
        .map(([id]) => id);
      
      const winningTrackId = leadingTracks[Math.floor(Math.random() * leadingTracks.length)];
      setResultTrack(tracks[winningTrackId]);
      setScreen('result');
    } else {
      setQuizState({
        currentQuestion: quizState.currentQuestion + 1,
        scores: newScores,
        answers: newAnswers
      });
    }
  }, [quizState]);

  const handleRestart = useCallback(() => {
    setQuizState(initialQuizState);
    setResultTrack(null);
    setScreen('intro');
  }, []);

  return (
    <div className="app">
      <div className="background-effects">
        <div className="bg-gradient"></div>
        <div className="bg-stars"></div>
      </div>
      
      <main className="main-content">
        {screen === 'intro' && (
          <IntroScreen onStart={handleStart} />
        )}
        
        {screen === 'quiz' && (
          <QuizScreen
            question={questions[quizState.currentQuestion]}
            currentIndex={quizState.currentQuestion}
            totalQuestions={questions.length}
            onAnswer={handleAnswer}
          />
        )}
        
        {screen === 'result' && resultTrack && (
          <ResultScreen 
            track={resultTrack}
            onRestart={handleRestart}
          />
        )}
      </main>
    </div>
  );
}

export default App;
