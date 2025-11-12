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
        
        // Extract user-friendly error message
        let errorMessage = 'Failed to generate rubric. Please try again.';
        
        if (err.error?.message) {
          errorMessage = err.error.message;
        } else if (err.error?.error) {
          errorMessage = err.error.error;
        } else if (err.message) {
          errorMessage = err.message;
        } else if (err.status === 0) {
          errorMessage = '🌐 Cannot connect to server. Please check your internet connection or try again later.';
        } else if (err.status === 500) {
          errorMessage = '⚠️ Server error occurred. Please try again in a moment.';
        } else if (err.status === 504) {
          errorMessage = '⏰ Request timeout. The server is taking longer than expected. Please try again.';
        }
        
        this.error = errorMessage;
        this.loading = false;
      }
    });
  }
}
