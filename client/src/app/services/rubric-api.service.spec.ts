import { TestBed } from '@angular/core/testing';

import { RubricApiService } from './rubric-api.service';

describe('RubricApiService', () => {
  let service: RubricApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RubricApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
