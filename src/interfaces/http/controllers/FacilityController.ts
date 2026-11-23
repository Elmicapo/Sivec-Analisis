import { NextFunction, Request, Response } from 'express';
import { ISportsFacilityRepository } from '../../../domain/repositories/IRepositories';

export class FacilityController {
  constructor(private readonly facilityRepo: Pick<ISportsFacilityRepository, 'findAll'>) {}

  getAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const facilities = await this.facilityRepo.findAll();
      res.json({ data: facilities });
    } catch (error) {
      next(error);
    }
  };
}