export interface PuurgaGameProps {
  /** Return to Puurga Games hub */
  onExit?: () => void;
  /** Report score for credits / last-result banner */
  onScore?: (score: number, meta?: Record<string, unknown>) => void;
}

export interface PuurgaGameMeta {
  title: string;
  description: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  category?: string;
  rewardCoins?: number;
  playTime?: string;
}
