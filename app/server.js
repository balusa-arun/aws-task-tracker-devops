import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

const app = express();
app.use(express.json());
app.use(express.static('public'));
const port = process.env.PORT || 3000;
const tableName = process.env.TABLE_NAME;
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/tasks', async (_req, res) => {
  try {
    const result = await docClient.send(new ScanCommand({ TableName: tableName }));
    const tasks = (result.Items || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(tasks);
  } catch (err) {
    console.error('GET tasks failed:', err);
    res.status(500).json({ error: 'Could not load tasks' });
  }
});
app.post('/api/tasks', async (req, res) => {
  const title = String(req.body?.title || '').trim();
  if (!title || title.length > 200) return res.status(400).json({ error: 'Task title must be 1–200 characters' });
  const task = { id: randomUUID(), title, createdAt: new Date().toISOString() };
  try {
    await docClient.send(new PutCommand({ TableName: tableName, Item: task }));
    res.status(201).json(task);
  } catch (err) {
    console.error('POST task failed:', err);
    res.status(500).json({ error: 'Could not save task' });
  }
});
app.listen(port, '0.0.0.0', () => console.log(`Task Tracker listening on port ${port}; table=${tableName}`));
