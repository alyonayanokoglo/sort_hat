export type TrackId = 'gryffindor' | 'hufflepuff' | 'ravenclaw' | 'slytherin' | 'promptevrin';

export interface Track {
  id: TrackId;
  name: string;
  description: string;
  emoji: string;
  image: string;
  color: string;
  gradient: string;
}

export interface Answer {
  text: string;
  points: Partial<Record<TrackId, number>>;
}

export interface Question {
  id: number;
  text: string;
  answers: Answer[];
}

export interface QuizState {
  currentQuestion: number;
  scores: Record<TrackId, number>;
  answers: number[];
}

export type GameScreen = 'intro' | 'quiz' | 'result';
