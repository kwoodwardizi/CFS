# Cycling Fantasy Scraper Service

A headless browser service using Puppeteer to scrape ProCyclingStats and bypass Cloudflare protection.

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the service:
```bash
npm start
```

The service will run on `http://localhost:3001`

3. Test it:
```bash
curl -X POST http://localhost:3001/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.procyclingstats.com/race/vuelta-a-espana/2025/startlist"}'
```

## Deployment Options

### Option 1: Render.com (Free Tier)

1. Push this folder to a GitHub repository
2. Go to [render.com](https://render.com) and create a new account
3. Click "New +" → "Web Service"
4. Connect your GitHub repo
5. Configure:
   - **Name**: cycling-fantasy-scraper
   - **Environment**: Docker
   - **Plan**: Free
   - **Environment Variables**:
     - `ALLOWED_ORIGINS`: Your Supabase function URL (optional, for security)
6. Click "Create Web Service"
7. Copy the service URL (e.g., `https://cycling-fantasy-scraper.onrender.com`)

**Note**: Free tier sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds.

### Option 2: Railway.app (Free $5/month credit)

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project" → "Deploy from GitHub repo"
3. Select your repository and the `scraper-service` folder
4. Railway will auto-detect the Dockerfile
5. Add environment variables if needed
6. Deploy
7. Generate a public domain from settings

### Option 3: Fly.io (Free tier available)

1. Install flyctl: `brew install flyctl` (Mac) or see [fly.io/docs/hands-on/install-flyctl/](https://fly.io/docs/hands-on/install-flyctl/)
2. Login: `fly auth login`
3. From this directory, run:
```bash
fly launch --name cycling-fantasy-scraper
fly deploy
```

## API Endpoints

### POST /scrape

Scrapes a URL and returns the HTML content.

**Request:**
```json
{
  "url": "https://www.procyclingstats.com/race/vuelta-a-espana/2025/stage-1",
  "waitForSelector": "table.results" // optional
}
```

**Response:**
```json
{
  "success": true,
  "html": "<!DOCTYPE html>...",
  "url": "https://...",
  "timestamp": "2025-02-05T..."
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-02-05T..."
}
```

## Security Notes

- Set `ALLOWED_ORIGINS` environment variable to restrict access to your Supabase edge function
- Consider adding an API key for additional security
- Monitor usage to avoid abuse

## Cost Considerations

- **Render Free**: Good for low usage, sleeps after inactivity
- **Railway**: $5/month credit, pay for what you use
- **Fly.io**: Free tier includes 3 shared VMs
- **Self-hosted**: Deploy on any VPS ($5-10/month)

## Troubleshooting

**Browser fails to launch**: Make sure all system dependencies are installed (see Dockerfile)

**Timeout errors**: Increase timeout in the Puppeteer launch options

**Memory issues**: Upgrade to a paid tier with more RAM (Puppeteer needs ~512MB)
