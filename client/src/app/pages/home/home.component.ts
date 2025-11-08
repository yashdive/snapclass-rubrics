import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RubricApiService } from '../../services/rubric-api.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  loading = false;
  error = '';
  
  title = '';
  description = '';
  question = '';

  constructor(
    private rubricApiService: RubricApiService,
    private router: Router
  ) {}

  onSubmit() {
    this.error = '';
    this.loading = true;
    
    console.log('Generating rubric with:', { title: this.title, description: this.description, question: this.question });
    
    this.rubricApiService.generateRubric({
      title: this.title,
      description: this.description,
      question: this.question
    }).subscribe({
      next: (response) => {
        console.log('Backend response:', response);
        
        // Navigate to rubric display with data
        this.router.navigate(['/rubric'], {
          state: {
            rubric: response,
            assignmentInfo: {
              title: this.title,
              description: this.description,
              question: this.question
            }
          }
        });
      },
      error: (err) => {
        console.error('Generation error:', err);
        this.error = err.message || 'Failed to generate rubric';
        this.loading = false;
      }
    });
  }
}
