import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { EnrollAthleteUseCase } from './application/use-cases/EnrollAthleteUseCase';
import { pool } from './infrastructure/config/database.config';
import {
  InMemoryDisciplineRepository,
  InMemoryEnrollmentRepository,
  InMemoryScheduleRepository,
} from './infrastructure/repositories/in-memory/InMemoryRepositories';
import { MySqlFacilityRepository } from './infrastructure/repositories/mysql/MySqlFacilityRepository';
import { EnrollmentController } from './interfaces/http/controllers/EnrollmentController';
import { FacilityController } from './interfaces/http/controllers/FacilityController';
import { errorHandler } from './interfaces/http/middlewares/ErrorHandler';
import { createApiRouter } from './interfaces/http/routes/api.routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

const enrollAthlete = new EnrollAthleteUseCase(
  new InMemoryEnrollmentRepository(),
  new InMemoryScheduleRepository(),
  new InMemoryDisciplineRepository(),
);
const enrollmentController = new EnrollmentController(enrollAthlete);
const facilityController = new FacilityController(new MySqlFacilityRepository(pool));

app.use('/api/v1', createApiRouter(enrollmentController, facilityController));
app.use(errorHandler);

export default app;