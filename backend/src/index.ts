import dotenv from 'dotenv';

// Load environment before anything reads process.env at module scope.
dotenv.config();

import { createApp } from './app';
import { allowedOrigins } from './lib/cors';

const app = createApp();
const port = process.env.PORT || 5001;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`CORS allowlist: ${allowedOrigins.join(', ')}`);
});
