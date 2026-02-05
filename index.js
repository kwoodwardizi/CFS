import express from 'express'
import cors from 'cors'
import puppeteer from 'puppeteer'

const app = express()
const PORT = process.env.PORT || 3001

// Security: only allow requests from your edge function
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['*']

app.use(cors({
  origin: ALLOWED_ORIGINS.includes('*') ? '*' : ALLOWED_ORIGINS
}))
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Main scraping endpoint
app.post('/scrape', async (req, res) => {
  const { url, waitForSelector } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  console.log(`Scraping: ${url}`)
  let browser = null

  try {
    // Launch browser in headless mode with optimizations
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-blink-features=AutomationControlled',  // Hide automation
        '--window-size=1920,1080'
      ]
    })

    const page = await browser.newPage()

    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 })

    // Hide webdriver property to avoid detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      })
    })

    // Navigate to the page with increased timeout and more lenient wait condition
    await page.goto(url, {
      waitUntil: 'domcontentloaded',  // Less strict than networkidle2
      timeout: 60000  // Increased from 30s to 60s
    })

    // Wait a bit for JavaScript to execute
    await page.waitForTimeout(3000)

    // Optional: wait for a specific selector if provided
    if (waitForSelector) {
      try {
        await page.waitForSelector(waitForSelector, { timeout: 15000 })
      } catch (err) {
        console.log(`Selector ${waitForSelector} not found, continuing anyway`)
      }
    }

    // Get the full HTML content
    const html = await page.content()

    console.log(`Successfully scraped ${url} (${html.length} bytes)`)

    res.json({
      success: true,
      html,
      url,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Scraping error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message,
      url
    })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
})

app.listen(PORT, () => {
  console.log(`Scraper service running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/health`)
})
