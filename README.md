# 🎯 Hagai - AI-Powered Asana Project Management Assistant

Hagai is an intelligent project management assistant built with [VoltAgent](https://voltagent.dev) that integrates with Asana to provide comprehensive task and project insights.

## Features

### 📊 Daily Status Reporting
- **What was done today?** - Tasks completed today with completion timestamps
- **What was updated today?** - All task modifications in the current day
- **What's due today?** - Tasks with today's due date

### 📅 Weekly Planning & Team Workload
- **Weekly task planning** - All tasks due within the current week
- **Team workload analysis** - Task distribution across team members
- **Overdue tasks by person** - Identify bottlenecks and at-risk assignments

### 🗂️ Project & Section Status Tracking
- **Project status analysis** - Overall completion rates and task counts
- **Section breakdown** - Detailed progress by project sections
- **Workload by section** - Identify sections with the most work

### 📈 Due Date Change Tracking
- **Task postponement history** - Track how many times tasks have been delayed
- **Most postponed tasks** - Identify problematic tasks and patterns
- **Recent due date changes** - Monitor recent deadline adjustments

### 🔍 Additional Queries
- **Overdue tasks** - All incomplete tasks past their due date
- **Unassigned tasks** - Tasks without owners
- **Tasks without due dates** - Missing deadlines
- **Search tasks by name** - Find specific tasks
- **Team member list** - View all workspace users

## Prerequisites

- Node.js >= 20
- pnpm (recommended) or npm
- Asana account with API access
- Anthropic API key (for Claude) or OpenAI API key (for GPT)

## Quick Start

### 1. Installation

```bash
# Clone or download this project
cd hagai

# Install dependencies
pnpm install
```

### 2. Asana Setup

#### Get your Asana Access Token:
1. Go to [Asana Developer Console](https://app.asana.com/0/developer-console)
2. Click "Create new token" under "Personal access tokens"
3. Give it a name (e.g., "Hagai Assistant")
4. Copy the token (you won't be able to see it again!)

#### Get your Workspace GID:
1. Open Asana in your browser
2. Go to your workspace
3. The URL will look like: `https://app.asana.com/0/{WORKSPACE_GID}/...`
4. Copy the workspace GID from the URL

Alternatively, you can use the Asana API:
```bash
curl https://app.asana.com/api/1.0/workspaces \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 3. Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Asana Configuration (REQUIRED)
ASANA_ACCESS_TOKEN=your_asana_access_token_here
ASANA_WORKSPACE_GID=your_workspace_gid_here

# LLM Provider Configuration (Choose one)
LLM_PROVIDER=anthropic  # or 'openai'

# Anthropic API Key (if using Claude)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# OpenAI API Key (if using GPT)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o

# Server Configuration (optional)
PORT=3141
LOG_LEVEL=info
```

### 4. Run the Application

#### Development mode (with hot reload):
```bash
pnpm dev
```

#### Production mode:
```bash
pnpm build
pnpm start
```

### 5. Access Hagai

Once the server starts, you'll see:

```
════════════════════════════════════════════════════
🎯 HAGAI - ASANA PROJECT MANAGEMENT ASSISTANT
════════════════════════════════════════════════════
✓ Agent: Hagai (Project Management Assistant)
✓ Asana Workspace: 1234567890123456
✓ LLM Provider: anthropic

🌐 Server: http://localhost:3141
📊 VoltOps Console: https://console.voltagent.dev
════════════════════════════════════════════════════
```

1. Open [VoltOps Console](https://console.voltagent.dev)
2. Select your project
3. Click on the "Hagai" agent
4. Start chatting! 💬

## Example Queries

### Daily Status
- "What was done today?"
- "Show me tasks completed today"
- "What was updated today?"
- "What's due today?"

### Weekly Planning
- "What's planned for this week?"
- "Show me this week's tasks"
- "Who has how many tasks?"
- "What's the team workload?"

### Project Status
- "What's the status of project X?"
- "Show me the Marketing Campaign project status"
- "Which section has the most work in project Y?"
- "List all projects"

### Due Date Tracking
- "Which tasks had their due date changed?"
- "Show me the most postponed tasks"
- "How many times was task X postponed?"
- "What due dates were changed recently?"

### Task Queries
- "What tasks are overdue?"
- "Show me unassigned tasks"
- "Which tasks have no due date?"
- "Find tasks about user authentication"
- "Who's on the team?"

## Architecture

### Project Structure

```
hagai/
├── src/
│   ├── api/
│   │   └── asana-client.ts       # Asana API client with rate limiting
│   ├── tools/
│   │   ├── daily-status.ts       # Daily status tools
│   │   ├── weekly-planning.ts    # Weekly planning & workload tools
│   │   ├── project-status.ts     # Project & section status tools
│   │   ├── due-date-tracking.ts  # Due date change tracking tools
│   │   ├── additional-queries.ts # Additional query tools
│   │   └── index.ts              # Tool exports
│   ├── types/
│   │   └── asana.ts              # TypeScript type definitions
│   ├── agent.ts                  # Hagai agent configuration
│   └── index.ts                  # Main entry point
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Key Components

#### Asana API Client
- **Rate limiting**: Conservative limit of 100 requests per minute
- **Error handling**: Graceful error handling with informative messages
- **Caching**: Smart request batching to minimize API calls

#### Tools (18 total)
All tools are Zod-validated with clear descriptions for the LLM to understand when to use each one:

1. `get_tasks_completed_today` - Tasks marked complete today
2. `get_tasks_updated_today` - Tasks modified today
3. `get_tasks_due_today` - Tasks due today
4. `get_weekly_planned_tasks` - Tasks due this week
5. `get_team_workload` - Workload distribution analysis
6. `get_overdue_tasks_by_person` - Overdue tasks grouped by assignee
7. `get_project_status` - Project completion analysis
8. `get_section_with_most_work` - Section workload analysis
9. `list_all_projects` - List all workspace projects
10. `get_task_due_date_changes` - Due date change history for a task
11. `get_most_postponed_tasks` - Most frequently postponed tasks
12. `get_recent_due_date_changes` - Recent due date modifications
13. `get_overdue_tasks` - All overdue tasks
14. `get_unassigned_tasks` - Tasks without assignees
15. `get_tasks_without_due_dates` - Tasks missing deadlines
16. `search_tasks_by_name` - Search tasks by name
17. `get_workspace_users` - List team members

#### Agent Configuration
- **Model**: Claude 3.5 Sonnet or GPT-4o
- **Memory**: Persistent conversation history using LibSQL
- **System Prompt**: Optimized for project management insights
- **Response Style**: Concise, data-driven, actionable

## Development

### Available Scripts

```bash
pnpm dev           # Start in development mode with hot reload
pnpm build         # Build for production
pnpm start         # Run production build
pnpm lint          # Lint code with Biome
pnpm lint:fix      # Auto-fix linting issues
pnpm typecheck     # Type check without emitting
```

### Adding New Tools

1. Create a new tool file in `src/tools/`
2. Define the tool using `createTool` from `@voltagent/core`
3. Add Zod schema for parameters
4. Implement the `execute` function
5. Export from `src/tools/index.ts`
6. Add to the tools array in `src/agent.ts`

Example:

```typescript
export function createMyTools(asanaClient: AsanaClient) {
  const myTool = createTool({
    name: 'my_tool',
    description: 'Clear description for the LLM',
    parameters: z.object({
      param: z.string().describe('Parameter description'),
    }),
    execute: async ({ param }) => {
      // Implementation
      return { result: 'data' };
    },
  });

  return { myTool };
}
```

## Troubleshooting

### Authentication Errors

```
Error: Failed to fetch tasks: 401 Unauthorized
```

**Solution**: Check your `ASANA_ACCESS_TOKEN` in `.env` file. Make sure it's valid and hasn't expired.

### Workspace Not Found

```
Error: Workspace not found
```

**Solution**: Verify your `ASANA_WORKSPACE_GID` is correct. You can list your workspaces using:

```bash
curl https://app.asana.com/api/1.0/workspaces \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Rate Limiting

```
Rate limit approaching, waiting...
```

**Solution**: This is expected behavior. The client automatically handles rate limiting. If you see this frequently, consider reducing concurrent operations.

### Model API Key Issues

```
Error: ANTHROPIC_API_KEY is required
```

**Solution**: Add your Anthropic API key to `.env` file, or switch to OpenAI by setting `LLM_PROVIDER=openai` and providing `OPENAI_API_KEY`.

## API Limits & Considerations

### Asana API Limits
- **Rate limit**: 1500 requests per minute per token
- **Hagai limit**: Conservative 100 requests/minute to avoid hitting limits
- **Pagination**: Automatically handled for large result sets

### Performance Optimization
- Tool calls are optimized to minimize API requests
- Results are formatted client-side when possible
- Date filtering is done server-side via Asana API

## Built With

- [VoltAgent](https://voltagent.dev) - AI agent framework
- [Asana API](https://developers.asana.com/docs) - Project management integration
- [Anthropic Claude](https://anthropic.com) / [OpenAI GPT](https://openai.com) - Language models
- [TypeScript](https://typescriptlang.org) - Type safety
- [Zod](https://zod.dev) - Schema validation

## License

MIT

## Support

For issues or questions:
- Open an issue on GitHub
- Check [VoltAgent documentation](https://voltagent.dev/docs)
- Review [Asana API documentation](https://developers.asana.com/docs)

---

Built with ❤️ by Hagia Labs using VoltAgent
