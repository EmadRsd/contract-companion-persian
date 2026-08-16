import express from 'express';
import bodyParser from 'body-parser';
import { signInHandler, signOutHandler, getSessionHandler, createUserHandler, createRoleHandler, requireAuthFromReq } from '@/serverFns/auth';

const app = express();
app.use(bodyParser.json());

app.post('/api/auth/signin', async (req, res) => {
  const { email, password } = req.body;
  const result = await signInHandler({ email, password, req, res });
  res.status(result.status).json(result.json);
});

app.post('/api/auth/signout', async (req, res) => {
  const result = await signOutHandler({ req, res });
  res.status(result.status).json(result.json);
});

app.get('/api/auth/session', async (req, res) => {
  const result = await getSessionHandler({ req });
  res.status(result.status).json(result.json);
});

// Admin endpoints
app.post('/api/auth/users', async (req, res) => {
  try {
    const authUser = await (async () => { try { return await requireAuthFromReq(req); } catch { return null; } })();
    const { email, password, fullName, roles } = req.body;
    const result = await createUserHandler({ email, password, fullName, roles, req, res, authUser });
    res.status(result.status).json(result.json);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/roles', async (req, res) => {
  try {
    const authUser = await (async () => { try { return await requireAuthFromReq(req); } catch { return null; } })();
    const { name, permissions } = req.body;
    const result = await createRoleHandler({ name, permissions, authUser });
    res.status(result.status).json(result.json);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 8080;
app.listen(port, () => {
  console.log(`Auth server listening on port ${port}`);
});
