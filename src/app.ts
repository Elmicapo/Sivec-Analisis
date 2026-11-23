import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { ENV } from './config/env.config';
import { AuthController } from './interfaces/http/controllers/AuthController';
import { pool } from './infrastructure/config/database.config';
import { MySqlEnrollmentRepository } from './infrastructure/repositories/mysql/MySqlEnrollmentRepository';
import { MySqlScheduleCatalog } from './infrastructure/repositories/mysql/MySqlScheduleCatalog';
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

if (ENV.JWT_SECRET.length < 32) throw new Error('Configura JWT_SECRET con al menos 32 caracteres en .env.');
const authController = new AuthController(pool, ENV.JWT_SECRET);
const schedules = new MySqlScheduleCatalog(pool);
app.use('/api/v1', createApiRouter(enrollmentController, facilityController, authController, schedules));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(errorHandler);

export default app;
