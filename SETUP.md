# Hagai - Quick Setup Guide

## 🚀 Get Started in 3 Steps

### Step 1: Get Asana Credentials

#### Get Access Token:
1. Visit https://app.asana.com/0/developer-console
2. Click "Create new token"
3. Name it "Hagai Assistant"
4. Copy the token immediately (you won't see it again!)

#### Get Workspace GID:
1. Open Asana in your browser
2. Go to any workspace
3. Look at the URL: `https://app.asana.com/0/{WORKSPACE_GID}/...`
4. Copy the workspace GID

**OR** use this command:
```bash
curl https://app.asana.com/api/1.0/workspaces \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Step 2: Configure Environment

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and add your credentials:
```env
# Required
ASANA_ACCESS_TOKEN=your_asana_token_here
ASANA_WORKSPACE_GID=your_workspace_gid_here

# Choose one LLM provider
LLM_PROVIDER=anthropic

# If using Anthropic (Claude)
ANTHROPIC_API_KEY=your_anthropic_key_here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# OR if using OpenAI (GPT)
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-4o
```

### Step 3: Run Hagai

#### Development mode (with hot reload):
```bash
npm run dev
```

#### Production mode:
```bash
npm run build
npm start
```

You should see:
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

## 🎯 Using Hagai

1. Open https://console.voltagent.dev in your browser
2. Select your project from the dropdown
3. Click on "Hagai" agent
4. Click the chat icon (💬) in the bottom right
5. Start asking questions!

## 💬 Example Questions

### Daily Status
- "What was done today?"
- "Show me tasks completed today"
- "What was updated today?"
- "What's due today?"

### Weekly Planning
- "What's planned for this week?"
- "Who has how many tasks?"
- "Show me overdue tasks per person"

### Project Status
- "What's the status of [Project Name]?"
- "Which section has the most work in [Project Name]?"
- "List all projects"

### Due Date Tracking
- "Show me the most postponed tasks"
- "Which tasks had their due date changed recently?"
- "How many times was [Task Name] postponed?"

### Task Management
- "What tasks are overdue?"
- "Show me unassigned tasks"
- "Which tasks have no due date?"
- "Find tasks about [keyword]"

## 📊 What Hagai Can Do

✅ **Daily Status Reports** - Track what's completed, updated, or due today
✅ **Weekly Planning** - View all tasks for the week
✅ **Team Workload Analysis** - See who's working on what
✅ **Project Insights** - Completion rates and section breakdowns
✅ **Due Date Monitoring** - Track postponed and delayed tasks
✅ **Task Search** - Find tasks by name or status
✅ **Smart Queries** - Overdue, unassigned, or missing deadlines

## 🛠️ Troubleshooting

### "401 Unauthorized" Error
- Check your `ASANA_ACCESS_TOKEN` in `.env`
- Make sure the token hasn't expired
- Generate a new token if needed

### "Workspace not found"
- Verify `ASANA_WORKSPACE_GID` is correct
- Use the curl command above to list your workspaces

### "LLM API Key" Error
- Check `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` in `.env`
- Make sure you've selected the correct `LLM_PROVIDER`

### "Rate limit approaching"
- This is normal - Hagai automatically handles rate limiting
- Wait a moment and it will continue

## 📚 Full Documentation

See [README.md](./README.md) for comprehensive documentation including:
- Detailed architecture
- All 17 tools and their capabilities
- Advanced configuration
- Development guide
- API reference

## 🎉 You're All Set!

Hagai is now ready to help you manage your Asana projects with AI-powered insights!

---

Built with ❤️ by Hagia Labs using VoltAgent
