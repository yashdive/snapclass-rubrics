import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RubricApiService } from '../../services/rubric-api.service';

interface Objective {
  objective: string;
  points: number;
}

interface Category {
  category: string;
  reasoning: string;
  points: number;
  objectives: Objective[];
}

interface Rubric {
  rubric_title: string;
  description: string;
  total_points: number;
  categories: Category[];
}

interface EditingCell {
  categoryIndex: number;
  objectiveIndex: number;
}

interface RegeneratingRow {
  categoryIndex: number;
}

@Component({
  selector: 'app-rubric-display',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './rubric-display.component.html',
  styleUrl: './rubric-display.component.css'
})
export class RubricDisplayComponent implements OnInit {

  // Drag-and-drop state for category rows
  draggingCategoryIdx: number | null = null;
  dragOverCategoryIdx: number | null = null;

  onCategoryDragStart(event: DragEvent, idx: number) {
    this.draggingCategoryIdx = idx;
    event.dataTransfer?.setData('text/plain', idx.toString());
    event.dataTransfer!.effectAllowed = 'move';
  }

  onCategoryDragOver(event: DragEvent, idx: number) {
    event.preventDefault();
    this.dragOverCategoryIdx = idx;
    event.dataTransfer!.dropEffect = 'move';
  }

  onCategoryDragEnter(event: DragEvent, idx: number) {
    event.preventDefault();
    this.dragOverCategoryIdx = idx;
  }

  onCategoryDragLeave(event: DragEvent, idx: number) {
    this.dragOverCategoryIdx = null;
  }

  onCategoryDrop(event: DragEvent, idx: number) {
    event.preventDefault();
    if (this.draggingCategoryIdx === null || !this.rubric) return;
    const fromIdx = this.draggingCategoryIdx;
    const toIdx = idx;
    if (fromIdx === toIdx) {
      this.draggingCategoryIdx = null;
      this.dragOverCategoryIdx = null;
      return;
    }
    const cats = this.rubric.categories;
    const [moved] = cats.splice(fromIdx, 1);
    cats.splice(toIdx, 0, moved);
    this.draggingCategoryIdx = null;
    this.dragOverCategoryIdx = null;
  }

  isCategoryDragging(idx: number): boolean {
    return this.draggingCategoryIdx === idx;
  }

  isCategoryDragOver(idx: number): boolean {
    return this.dragOverCategoryIdx === idx && this.draggingCategoryIdx !== null && this.draggingCategoryIdx !== idx;
  }

  moveCategoryRow(index: number, direction: 1 | -1) {
    if (!this.rubric) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.rubric.categories.length) return;
    const cats = this.rubric.categories;
    [cats[index], cats[newIndex]] = [cats[newIndex], cats[index]];
  }
  rubric: Rubric | null = null;
  loading = false;
  error = '';
  
  title = '';
  description = '';
  question = '';
  
  editMode = false;
  editingCell: EditingCell | null = null;
  cellInstruction = '';
  regeneratingCell: EditingCell | null = null;
  regeneratingRow: RegeneratingRow | null = null;
  // Per-row instruction text keyed by category index
  rowInstructions: Record<number, string> = {};
  // Track which row instruction panel is open
  rowInstructionOpen: Record<number, boolean> = {};

  constructor(
    private router: Router,
    private rubricApiService: RubricApiService
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      const state = navigation.extras.state as any;
      if (state['rubric']) {
        this.rubric = this.normalizeRubricData(state['rubric']);
      }
      if (state['assignmentInfo']) {
        this.title = state['assignmentInfo'].title || '';
        this.description = state['assignmentInfo'].description || '';
        this.question = state['assignmentInfo'].question || '';
      }
    }
  }

  ngOnInit() {
    if (!this.rubric) {
      this.router.navigate(['/']);
    }
  }

  normalizeRubricData(raw: any): Rubric | null {
    console.log('=== NORMALIZING RUBRIC DATA ===');
    console.log('Raw input:', JSON.stringify(raw, null, 2));
    
    if (!raw) {
      console.log('Raw is null/undefined');
      return null;
    }

    let unwrapped = raw;
    
    if (raw.data?.content) {
      console.log('Unwrapping from data.content');
      unwrapped = raw.data.content;
    }
    
    if (Array.isArray(unwrapped)) {
      console.log('Unwrapping array, taking first item');
      unwrapped = unwrapped[0];
    }
    
    if (!unwrapped || typeof unwrapped !== 'object') {
      console.log('After unwrapping, data is invalid');
      return null;
    }

    const categoriesRaw = unwrapped.categories || unwrapped.rubrics || [];
    
    if (!Array.isArray(categoriesRaw) || categoriesRaw.length === 0) {
      console.log('No valid categories found');
      return null;
    }

    const categories: Category[] = categoriesRaw.map((cat: any, idx: number) => {
      const objectivesRaw = cat.objectives || cat.rubrics || [];
      
      const objectives: Objective[] = objectivesRaw.map((obj: any) => ({
        objective: obj.objective || obj.description || obj.criteria || '',
        points: Number(obj.points ?? obj.score ?? 0)
      }));
      
      const categoryPoints = Number(
        cat.points ?? objectives.reduce((sum, o) => sum + o.points, 0)
      );
      
      return {
        category: cat.category || cat.name || `Category ${idx + 1}`,
        reasoning: cat.reasoning || '',
        points: categoryPoints,
        objectives: objectives
      };
    });

    const rubricTitle = unwrapped.rubric_title || unwrapped.title || 'Generated Rubric';
    const rubricDescription = typeof unwrapped.description === 'string'
      ? unwrapped.description
      : Array.isArray(unwrapped.description)
        ? unwrapped.description.join(' ')
        : '';
    const totalPoints = Number(
      unwrapped.total_points ?? categories.reduce((sum, c) => sum + c.points, 0)
    );

    return {
      rubric_title: rubricTitle,
      description: rubricDescription,
      total_points: totalPoints,
      categories: categories
    };
  }

  onRegenerateAll(event: Event) {
    event.preventDefault();
    this.error = '';
    this.loading = true;
    
    this.rubricApiService.generateRubric({
      title: this.title,
      description: this.description,
      question: this.question
    }).subscribe({
      next: (response) => {
        const normalized = this.normalizeRubricData(response);
        if (normalized) {
          this.rubric = normalized;
          this.editMode = false;
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to regenerate rubric';
        this.loading = false;
      }
    });
  }

  onCellEdit(categoryIndex: number, objectiveIndex: number, newValue: string) {
    if (this.rubric) {
      this.rubric.categories[categoryIndex].objectives[objectiveIndex].objective = newValue;
    }
  }

  onPointsEdit(categoryIndex: number, objectiveIndex: number, newPoints: string) {
    if (this.rubric) {
      const oldPoints = this.rubric.categories[categoryIndex].objectives[objectiveIndex].points;
      const points = parseInt(newPoints) || 0;
      this.rubric.categories[categoryIndex].objectives[objectiveIndex].points = points;
      this.rubric.categories[categoryIndex].points += points - oldPoints;
    }
  }

  onCellRegenerate(categoryIndex: number, objectiveIndex: number) {
    if (!this.rubric) return;
    
    this.regeneratingCell = { categoryIndex, objectiveIndex };
    
    const category = this.rubric.categories[categoryIndex];
    const existingObjective = category.objectives[objectiveIndex];
    
    this.rubricApiService.regenerateCell({
      title: this.rubric.rubric_title,
      description: this.rubric.description,
      categoryName: category.category,
      categoryReasoning: category.reasoning,
      allObjectives: category.objectives,
      objectiveIndex: objectiveIndex,
      existingObjective: existingObjective,
      instruction: this.cellInstruction
    }).subscribe({
      next: (response) => {
        let newObjective = response.data?.objective || response.data;
        
        if (Array.isArray(newObjective)) {
          newObjective = newObjective[0];
        }
        
        if (!newObjective.objective && newObjective.description) {
          newObjective = {
            objective: newObjective.description,
            points: Number(newObjective.points ?? newObjective.score ?? 0)
          };
        }
        
        if (this.rubric) {
          const oldPoints = this.rubric.categories[categoryIndex].objectives[objectiveIndex].points;
          this.rubric.categories[categoryIndex].objectives[objectiveIndex] = newObjective;
          this.rubric.categories[categoryIndex].points += (Number(newObjective.points) || 0) - oldPoints;
        }
        
        this.editingCell = null;
        this.cellInstruction = '';
        this.regeneratingCell = null;
      },
      error: (err) => {
        alert('Failed to regenerate cell: ' + err.message);
        this.regeneratingCell = null;
      }
    });
  }

  onRowRegenerate(categoryIndex: number) {
    if (!this.rubric) return;
    // Open instruction panel instead of immediate regeneration
    this.rowInstructionOpen[categoryIndex] = true;
  }

  confirmRowRegenerate(categoryIndex: number) {
    if (!this.rubric) return;
    const cat = this.rubric.categories[categoryIndex];
    this.regeneratingRow = { categoryIndex };
    this.rubricApiService.regenerateRow({
      title: this.rubric.rubric_title,
      description: this.rubric.description,
      categoryName: cat.category,
      categoryReasoning: cat.reasoning,
      objectives: cat.objectives,
      instruction: this.rowInstructions[categoryIndex] || ''
    }).subscribe({
      next: (response) => {
        const newObjectives = response?.data?.objectives;
        if (Array.isArray(newObjectives) && this.rubric) {
          const originalSorted = [...cat.objectives].sort((a,b)=> (b.points||0)-(a.points||0));
          const incomingSorted = [...newObjectives].sort((a,b)=> (b.points||0)-(a.points||0));
          const remapped: Objective[] = originalSorted.map((orig, idx) => {
            const candidate = incomingSorted[idx];
            return {
              objective: candidate?.objective || candidate?.description || orig.objective,
              points: orig.points
            };
          });
          const final = cat.objectives.map(o => {
            const match = remapped.find(r => r.points === o.points);
            return match || o;
          });
          cat.objectives = final;
        }
        this.regeneratingRow = null;
        delete this.rowInstructions[categoryIndex];
        this.rowInstructionOpen[categoryIndex] = false;
      },
      error: (err) => {
        alert('Failed to regenerate row: ' + (err.message || 'Unknown error'));
        this.regeneratingRow = null;
      }
    });
  }

  cancelRowRegenerate(categoryIndex: number) {
    this.rowInstructionOpen[categoryIndex] = false;
  }

  isRowInstructionOpen(catIdx: number): boolean {
    return !!this.rowInstructionOpen[catIdx];
  }

  isRegeneratingRow(catIdx: number): boolean {
    return this.regeneratingRow?.categoryIndex === catIdx;
  }

  isEditing(catIdx: number, objIdx: number): boolean {
    return this.editingCell?.categoryIndex === catIdx && 
           this.editingCell?.objectiveIndex === objIdx;
  }

  isRegenerating(catIdx: number, objIdx: number): boolean {
    return this.regeneratingCell?.categoryIndex === catIdx && 
           this.regeneratingCell?.objectiveIndex === objIdx;
  }

  startEditing(catIdx: number, objIdx: number) {
    this.editingCell = { categoryIndex: catIdx, objectiveIndex: objIdx };
    this.cellInstruction = '';
  }

  stopEditing() {
    this.editingCell = null;
  }

  get maxObjectives(): number {
    if (!this.rubric) return 0;
    return Math.max(...this.rubric.categories.map(cat => cat.objectives?.length || 0));
  }

  getObjectivesArray(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
  }

  getColumnPoints(index: number): number | null {
    if (!this.rubric) return null;
    const values: number[] = [];
    for (const cat of this.rubric.categories) {
      const pts = cat.objectives?.[index]?.points;
      if (typeof pts === 'number' && !Number.isNaN(pts)) {
        values.push(pts);
      }
    }
    if (values.length === 0) return null;
    // Choose the most frequent points value across categories (mode)
    const freq = new Map<number, number>();
    for (const v of values) freq.set(v, (freq.get(v) || 0) + 1);
    let best = values[0];
    let bestCount = 0;
    for (const [v, c] of freq) {
      if (c > bestCount) {
        best = v;
        bestCount = c;
      }
    }
    return best;
  }
}
