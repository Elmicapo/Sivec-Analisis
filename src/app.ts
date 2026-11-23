import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { pool } from './infrastructure/config/database.config';
import { MySqlEnrollmentRepository } from './infrastructure/repositories/mysql/MySqlEnrollmentRepository';
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

const enrollmentController = new EnrollmentController(new MySqlEnrollmentRepository(pool));
const facilityController = new FacilityController(new MySqlFacilityRepository(pool));

app.use('/api/v1', createApiRouter(enrollmentController, facilityController));
app.use(errorHandler);

export default app;
