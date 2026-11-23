import { Request, Response } from 'express';
import { Enrollment } from '../../../domain/models/Enrollment';

export class EnrollmentController {
  constructor(private readonly enrollAthleteUseCase: { execute(athleteId: string, scheduleId: string): Promise<Enrollment> }) {}

  enroll = async (req: Request, res: Response): Promise<void> => {
    try {
      const athleteId: string = res.locals.athleteId;
      const { scheduleId } = req.body ?? {};
      if (typeof scheduleId !== 'string' || !scheduleId.trim()) {
        res.status(400).json({ error: 'scheduleId es obligatorio.' });
        return;
      }
      const enrollment = await this.enrollAthleteUseCase.execute(athleteId, scheduleId);
      res.status(201).json({
        message: 'Inscripción realizada exitosamente.',
        data: enrollment
      });
    } catch (error: any) {
      res.status(409).json({ error: error.message });
    }
  };
}
