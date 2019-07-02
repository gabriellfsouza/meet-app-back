import { Router } from 'express';

const routes = new Router();

routes.get('/', (req, res) => {
  res.json({ mensagem: 'foi' });
});

export default routes;
