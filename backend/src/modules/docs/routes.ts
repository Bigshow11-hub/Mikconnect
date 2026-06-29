import { Router, Request, Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import openapiSpec from './openapi.json';

const router = Router();

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(openapiSpec, { customSiteTitle: 'MikConnect API Docs' }));

router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(openapiSpec);
});

export default router;
