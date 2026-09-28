import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

interface ValidationTargets {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

export function validate(targets: ValidationTargets) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (targets.body) {
      req.body = targets.body.parse(req.body);
    }
    if (targets.query) {
      Object.assign(req.query, targets.query.parse(req.query));
    }
    if (targets.params) {
      Object.assign(req.params, targets.params.parse(req.params));
    }
    next();
  };
}
