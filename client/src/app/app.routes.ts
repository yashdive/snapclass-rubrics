import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { RubricDisplayComponent } from './pages/rubric-display/rubric-display.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'rubric', component: RubricDisplayComponent },
  { path: '**', redirectTo: '' }
];
