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

    // Set additional headers to look like a real browser
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    })

    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 })

    // Hide webdriver property to avoid detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      })
    })

    // Navigate to the page - use 'load' which waits for page load event
    await page.goto(url, {
      waitUntil: 'load',  // Wait for page load event (more reliable than networkidle)
      timeout: 60000
    })

    // Give page extra time to run JavaScript after load
    await new Promise(resolve => setTimeout(resolve, 3000))

    console.log('Page loaded, checking for results...')

    // Scroll down to trigger any lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Scroll back up
    await page.evaluate(() => {
      window.scrollTo(0, 0)
    })
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Try clicking "View full results" button if it exists
    try {
      const viewMoreButton = await page.$('.viewMoreResults')
      if (viewMoreButton) {
        console.log('Clicking "View more results" button...')
        await viewMoreButton.click()
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    } catch (err) {
      console.log('No view more button found')
    }

    // Check if table has content
    const rowCount = await page.evaluate(() => {
      const table = document.querySelector('table.results')
      if (!table) return 0
      const tbody = table.querySelector('tbody')
      if (!tbody) return 0
      return tbody.querySelectorAll('tr').length
    })

    console.log(`Table has ${rowCount} rows`)

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
