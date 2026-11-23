import { Request, Response } from 'express';
import { EnrollAthleteUseCase } from '../../../application/use-cases/EnrollAthleteUseCase';

export class EnrollmentController {
  constructor(private enrollAthleteUseCase: EnrollAthleteUseCase) {}

  enroll = async (req: Request, res: Response): Promise<void> => {
    try {
      const { athleteId, scheduleId } = req.body;
      if (!athleteId || !scheduleId) {
        res.status(400).json({ error: 'athleteId y scheduleId son obligatorios.' });
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
