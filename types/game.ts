import { Color } from './go';
import { Mistake } from './mistake';

export interface Game {
  id: string;
  sgf: string;
  playerColor: Color;
  opponentRank?: string;
  timeControl?: string;
  datePlayed?: Date;
  createdAt: Date;
}

export interface CreateGameInput {
  sgf: string;
  playerColor: Color;
  opponentRank?: string;
  timeControl?: string;
  datePlayed?: Date;
}

export interface GameWithMistakes extends Game {
  mistakes: Mistake[];
}
