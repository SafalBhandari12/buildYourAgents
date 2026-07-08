import { Context, Hono } from 'hono';
import ai from './ai';
import authRoute from './auth';
import apiKeys from './api-keys';
import documents from './documents';
import metrics from './metrics';
import llmKeys from './llm-keys';
import chatHistory from './chat-history';
import agentSettings from './agent-settings';
import knowledgeSettings from './knowledge-settings';

const v1 = new Hono();

v1.route('/auth', authRoute);

v1.route('/api-keys', apiKeys);

v1.route('/documents', documents);

v1.route('/metrics', metrics);

v1.route('/llm-keys', llmKeys);

v1.route('/chat-history', chatHistory);

v1.route('/agent-settings', agentSettings);

v1.route('/knowledge-settings', knowledgeSettings);

v1.route('/', ai);

export default v1;
