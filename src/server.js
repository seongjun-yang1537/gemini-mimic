const path = require('path');
const express = require('express');

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDirectoryPath = path.join(__dirname, '..', 'public');

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDirectoryPath));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/{*fallbackPath}', (_request, response) => {
  response.sendFile(path.join(publicDirectoryPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`[mimic] server listening on http://localhost:${port}`);
});
