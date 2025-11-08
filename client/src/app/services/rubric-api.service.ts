import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GenerateRubricRequest {
  title: string;
  description: string;
  question: string;
}

export interface RegenerateCellRequest {
  title: string;
  description: string;
  categoryName: string;
  categoryReasoning: string;
  allObjectives: any[];
  objectiveIndex: number;
  existingObjective: any;
  instruction: string;
}

export interface RegenerateRowRequest {
  title: string;
  description: string;
  categoryName: string;
  categoryReasoning: string;
  objectives: any[];
  instruction?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RubricApiService {
  private baseUrl = 'http://localhost:3001';

  constructor(private http: HttpClient) { }

  generateRubric(request: GenerateRubricRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/generate`, request);
  }

  regenerateCell(request: RegenerateCellRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/regenerate-cell`, request);
  }

  regenerateRow(request: RegenerateRowRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/regenerate-row`, request);
  }
}
