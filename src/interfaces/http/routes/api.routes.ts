import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { EnrollmentController } from '../controllers/EnrollmentController';
import { FacilityController } from '../controllers/FacilityController';

export function createApiRouter(
  enrollmentController: EnrollmentController,
  facilityController: FacilityController,
  authController: AuthController,
): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'UP', service: 'SIVEC Backend API (Layered/DDD)' });
  });
  router.post('/auth/login', authController.login);
  router.post('/enrollments', authController.requireAthlete, enrollmentController.enroll);
  router.get('/facilities', facilityController.getAll);

  return router;
}
