/**
 * Hagai - AI-powered Asana project management assistant
 * Built with VoltAgent framework
 */

import 'dotenv/config';
import { VoltAgent } from '@voltagent/core';
import { createPinoLogger } from '@voltagent/logger';
import { honoServer } from '@voltagent/server-hono';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { createHagaiAgent } from './agent.js';

// Load environment variables
const ASANA_ACCESS_TOKEN = process.env.ASANA_ACCESS_TOKEN;
const ASANA_WORKSPACE_GID = process.env.ASANA_WORKSPACE_GID;
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'anthropic';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const GOOGLE_MODEL = process.env.GOOGLE_MODEL || 'gemini-1.5-pro-latest';

// Validate required environment variables
if (!ASANA_ACCESS_TOKEN) {
  console.error('❌ ASANA_ACCESS_TOKEN is required in .env file');
  process.exit(1);
}

if (!ASANA_WORKSPACE_GID) {
  console.error('❌ ASANA_WORKSPACE_GID is required in .env file');
  process.exit(1);
}

// Select model based on provider
let model: any;
if (LLM_PROVIDER === 'anthropic') {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY is required when using Anthropic provider');
    process.exit(1);
  }
  model = anthropic(ANTHROPIC_MODEL);
  console.log(`✓ Using Anthropic model: ${ANTHROPIC_MODEL}`);
} else if (LLM_PROVIDER === 'openai') {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is required when using OpenAI provider');
    process.exit(1);
  }
  model = openai(OPENAI_MODEL);

  console.log(`✓ Using OpenAI model: ${OPENAI_MODEL}`);
} else if (LLM_PROVIDER === 'google') {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY is required when using Google provider');
    process.exit(1);
  }
  model = google(GOOGLE_MODEL);
  console.log(`✓ Using Google model: ${GOOGLE_MODEL}`);
} else {
  console.error(`❌ Invalid LLM_PROVIDER: ${LLM_PROVIDER}. Use 'anthropic', 'openai', or 'google'`);
  process.exit(1);
}

// Create logger
const logger = createPinoLogger({
  name: 'hagai',
  level: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
});

// Create Hagai agent
const hagaiAgent = createHagaiAgent(model, ASANA_ACCESS_TOKEN, ASANA_WORKSPACE_GID);

// Initialize VoltAgent
new VoltAgent({
  agents: {
    hagai: hagaiAgent,
  },
  server: honoServer({
    port: Number(process.env.PORT) || 3141,
  }),
  logger,
});

console.log('');
console.log('════════════════════════════════════════════════════');
console.log('🎯 HAGAI - ASANA PROJECT MANAGEMENT ASSISTANT');
console.log('════════════════════════════════════════════════════');
console.log(`✓ Agent: Hagai (Project Management Assistant)`);
console.log(`✓ Asana Workspace: ${ASANA_WORKSPACE_GID}`);
console.log(`✓ LLM Provider: ${LLM_PROVIDER}`);
console.log('');
console.log('🌐 Server: http://localhost:' + (process.env.PORT || 3141));
console.log('📊 VoltOps Console: https://console.voltagent.dev');
console.log('════════════════════════════════════════════════════');
console.log('');
console.log('Available capabilities:');
console.log('  • Daily status reports (completed, updated, due today)');
console.log('  • Weekly planning and team workload analysis');
console.log('  • Project and section status tracking');
console.log('  • Due date change monitoring');
console.log('  • Task queries (overdue, unassigned, no due dates)');
console.log('');
console.log('Open VoltOps Console to start chatting with Hagai!');
console.log('════════════════════════════════════════════════════');
