# OpenHands PR Review Dashboard

A Next.js dashboard for monitoring community PRs and review accountability in the OpenHands project.

## Features

- **Community PR Monitoring**: Track open PRs from external contributors
- **SLA Tracking**: Monitor response times and review times against defined SLAs
- **Reviewer Accountability**: Track reviewer assignments and pending review loads
- **Real-time Data**: Cached GitHub API data with configurable refresh intervals
- **Filtering**: Filter PRs by repository, labels, and age ranges

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and set your GitHub token:

```env
GITHUB_TOKEN=your_github_personal_access_token_here
```

### 2. GitHub Token Setup

Create a GitHub Personal Access Token with these permissions:
- `read:org` (to fetch organization members)
- `public_repo` (to read public repository data)

Get your token from: https://github.com/settings/tokens

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### 5. Test API Connection

Visit [http://localhost:3000/api/test](http://localhost:3000/api/test) to verify your GitHub token is working.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub Personal Access Token | Required |
| `ORGS` | Comma-separated list of GitHub organizations | `All-Hands-AI` |
| `REPOS_INCLUDE` | Specific repositories to include (owner/repo format) | Auto-discover |
| `REPOS_EXCLUDE` | Repositories to exclude from auto-discovery | None |
| `SLA_HOURS_FIRST_RESPONSE` | SLA for first human response (hours) | `24` |
| `SLA_HOURS_FIRST_REVIEW` | SLA for first review (hours) | `48` |
| `CACHE_TTL_SECONDS` | Cache duration for API responses | `120` |
| `MAX_PR_PAGES_PER_REPO` | Max GitHub API pages per repository | `10` |

### Employee Configuration

Edit `config/employees.json` to override employee detection:

```json
{
  "allowlist": ["username1", "username2"],
  "denylist": ["bot-account"]
}
```

## API Endpoints

- `GET /api/dashboard` - Main dashboard data with KPIs and PR list
- `GET /api/review-stats` - Review statistics and reviewer loads
- `GET /api/test` - Test GitHub API connection
- `GET /api/config/employees` - Employee statistics (debug only)

### Query Parameters

**Dashboard API (`/api/dashboard`)**:
- `repos` - Filter by repositories (comma-separated)
- `labels` - Filter by labels (comma-separated)
- `age` - Filter by age range (`0-24`, `24-48`, `48-96`, `96+`)
- `debug` - Include debug information

## Architecture

### Tech Stack
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **GitHub GraphQL API** for data fetching

### Key Components
- `lib/github.ts` - GitHub API client with GraphQL and REST support
- `lib/employees.ts` - Employee detection and management
- `lib/compute.ts` - PR data transformation and KPI calculations
- `lib/cache.ts` - In-memory caching system
- `components/` - Reusable React components

### Data Flow
1. API routes fetch data from GitHub using GraphQL
2. Employee set is built from organization memberships
3. PR data is transformed and enriched with computed fields
4. KPIs are calculated from the processed data
5. Results are cached to reduce API usage
6. Frontend displays data with real-time updates

## Development

### Project Structure
```
├── app/
│   ├── api/           # API routes
│   ├── globals.css    # Global styles
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Main dashboard page
├── components/        # React components
├── lib/              # Utility libraries
├── config/           # Configuration files
└── public/           # Static assets
```

### Adding New Features

1. **New API Endpoint**: Add route in `app/api/`
2. **New Component**: Add to `components/` directory
3. **New Utility**: Add to `lib/` directory
4. **Configuration**: Update `lib/config.ts` and `.env.local.example`

### Testing

Test individual API endpoints:
```bash
curl http://localhost:3000/api/test
curl http://localhost:3000/api/dashboard
curl http://localhost:3000/api/review-stats
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Docker

```bash
# Build image
docker build -t openhands-dashboard .

# Run container
docker run -p 3000:3000 --env-file .env.local openhands-dashboard
```

### Manual Deployment

```bash
npm run build
npm start
```

## Troubleshooting

### Common Issues

1. **"GITHUB_TOKEN environment variable is required"**
   - Ensure `.env.local` exists with valid `GITHUB_TOKEN`

2. **"GraphQL error: Bad credentials"**
   - Check that your GitHub token has correct permissions
   - Verify token hasn't expired

3. **Empty dashboard or no PRs**
   - Check that organizations/repositories exist and are accessible
   - Verify employee detection is working via `/api/config/employees?debug=true`

4. **Rate limiting errors**
   - Reduce `MAX_PR_PAGES_PER_REPO` in environment
   - Increase `CACHE_TTL_SECONDS` to reduce API calls

### Debug Mode

Add `?debug=true` to API endpoints for additional debugging information:
- `/api/dashboard?debug=true`
- `/api/config/employees?debug=true`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.