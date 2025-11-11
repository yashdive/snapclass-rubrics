import { HttpInterceptorFn } from '@angular/common/http';
import { finalize } from 'rxjs';

export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const startTime = Date.now();
  
  console.log(`[HTTP Request] ${req.method} ${req.url}`);

  return next(req).pipe(
    finalize(() => {
      const duration = Date.now() - startTime;
      console.log(`[HTTP Complete] ${req.method} ${req.url} - ${duration}ms`);
    })
  );
};
