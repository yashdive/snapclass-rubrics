import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RubricDisplayComponent } from './rubric-display.component';

describe('RubricDisplayComponent', () => {
  let component: RubricDisplayComponent;
  let fixture: ComponentFixture<RubricDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RubricDisplayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RubricDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
