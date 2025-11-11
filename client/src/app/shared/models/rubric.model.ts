export interface Rubric {
  title: string;
  description: string[];
  rubrics: RubricCategory[];
}

export interface RubricCategory {
  category: string;
  reasoning?: string;
  rubrics: RubricObjective[];
}

export interface RubricObjective {
  score: number;
  points?: number;
  description?: string;
  objective?: string;
}

export interface GenerateRubricRequest {
  title: string;
  description: string;
  question: string;
}

export interface GenerateRubricResponse {
  data: {
    content: Rubric;
  };
}

export interface RegenerateCellRequest {
  title: string;
  description: string;
  categoryName: string;
  categoryReasoning: string;
  allObjectives: RubricObjective[];
  objectiveIndex: number;
  existingObjective: RubricObjective;
  instruction: string;
}

export interface RegenerateCellResponse {
  data: {
    objective: RubricObjective;
  };
}

export interface RegenerateRowRequest {
  title: string;
  description: string;
  categoryName: string;
  categoryReasoning: string;
  objectives: RubricObjective[];
  instruction?: string;
}

export interface RegenerateRowResponse {
  data: {
    objectives: RubricObjective[];
  };
}
