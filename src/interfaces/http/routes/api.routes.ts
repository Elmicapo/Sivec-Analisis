import { Router } from 'express';
import { EnrollmentController } from '../controllers/EnrollmentController';
import { FacilityController } from '../controllers/FacilityController';

export function createApiRouter(
  enrollmentController: EnrollmentController,
  facilityController: FacilityController,
): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'UP', service: 'SIVEC Backend API (Layered/DDD)' });
  });
  router.post('/enrollments', enrollmentController.enroll);
  router.get('/facilities', facilityController.getAll);

  return router;
}