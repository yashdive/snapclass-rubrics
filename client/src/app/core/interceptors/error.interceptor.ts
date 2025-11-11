import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An error occurred';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        errorMessage = error.error?.error || error.message || 'Server error';
      }

      console.error('[HTTP Error]', {
        status: error.status,
        message: errorMessage,
        url: error.url,
      });

      return throwError(() => new Error(errorMessage));
    })
  );
};
