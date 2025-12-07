This is a [Next.js](https://nextjs.org) project featuring **AI-Powered Flight Search Automation** using Playwright and Gemini Vision API.

## Features

🤖 **Intelligent Flight Search Automation**
- Automated browser interaction with Playwright
- AI-powered data extraction using Gemini 2.0 Flash (Vision)
- Screenshot-based extraction (no fragile CSS selectors!)
- Supports booking.com and can be extended to other sites

## Getting Started

### 1. Environment Setup

Create a `.env.local` file in the `apps/web` directory:

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
```

Get your Gemini API key from: [Google AI Studio](https://makersuite.google.com/app/apikey)

### 2. Installation

Install Playwright browsers (required for automation):

```bash
pnpm exec playwright install chromium
```

### 3. Run Development Server

```bash
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000/flights](http://localhost:3000/flights) to access the flight search interface.

## Flight Search API

### Endpoint: `/api/search-flights`

**Request Body:**
```json
{
  "from": "BLR",
  "to": "CCU", 
  "departDate": "2025-12-25",
  "returnDate": "2025-12-30", // optional
  "passengers": 1,
  "tripType": "round-trip", // or "one-way"
  "travelClass": "economy",
  "directFlights": false
}
```

**Response:**
```json
{
  "flights": [
    {
      "id": "ai-flight-1",
      "airline": "IndiGo",
      "flightNumber": "6E2345",
      "departure": {
        "airport": "BLR",
        "time": "10:30",
        "date": "2025-12-25"
      },
      "arrival": {
        "airport": "CCU",
        "time": "13:15",
        "date": "2025-12-25"
      },
      "duration": 165,
      "stops": 0,
      "price": 4500
    }
  ],
  "extractedWith": "gemini-vision"
}
```

## System Architecture

```
User Input (Frontend) 
  → API Route (/api/search-flights)
  → Playwright Browser Automation
  → Screenshot Capture
  → Gemini Vision API (AI Extraction)
  → Structured JSON Response
```

### How It Works

1. **Browser Launch**: Playwright launches a headless Chrome browser
2. **Navigation**: Goes to booking.com flights page
3. **Form Filling**: Intelligently fills search forms with retry logic
4. **Search Submission**: Submits the search and waits for results
5. **Screenshot Analysis**: Takes screenshot of results page
6. **AI Extraction**: Gemini Vision API extracts flight data from screenshot
7. **Response**: Returns structured JSON with flight details

### Why Vision API?

Traditional web scraping breaks when websites change their HTML/CSS. Using Gemini's vision capabilities makes the automation **robust and adaptive** - it can understand flight data visually, just like a human would!

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
