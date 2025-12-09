# Browser Automation

A Next.js application for automating browser tasks using Playwright, with AI-powered analysis using Google Gemini.

## Features

- 🛫 **Flight Search Automation** - Automates Booking.com flight searches and extracts results
- 🚗 **Uber Ride Automation** - Automates Uber ride searches with persistent authentication
- 🤖 **AI-Powered Analysis** - Uses Gemini Vision API to extract data from screenshots
- 🎭 **Playwright Integration** - Headless browser automation with screenshot capture

## Project Structure

```
automation/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── flights/          # Flight search endpoint
│   │   └── uber/             # Uber automation endpoints
│   │       ├── route.ts      # Ride search
│   │       └── auth/         # Authentication flow
│   ├── flights/              # Flight search page
│   ├── uber/                 # Uber search page
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page
├── components/
│   ├── ui/                   # shadcn/ui components
│   └── automation/           # Automation-specific components
├── lib/
│   ├── automation/           # Automation helpers
│   │   ├── flights/          # Flight booking helpers
│   │   └── uber/             # Uber automation helpers
│   ├── schema/               # Zod validation schemas
│   ├── types/                # TypeScript types
│   ├── ai.ts                 # Gemini AI configuration
│   ├── playwright-utils.ts   # Playwright browser utilities
│   └── utils.ts              # General utilities
├── styles/                   # CSS stylesheets
├── public/                   # Static assets
└── config/                   # Configuration files
```

## Setup

### Prerequisites

- Node.js >= 18
- pnpm (recommended)

### Installation

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install chromium
```

### Environment Variables

Copy the example file and configure:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ Yes | Google Gemini API key for AI-powered screenshot analysis. The automation captures screenshots of search results and uses Gemini Vision to extract structured data (flight prices, ride options, etc.). [Get your key here](https://aistudio.google.com/app/apikey). |
| `HEADFUL` | ❌ No | Set to `true` to run the browser in visible (headed) mode. Required for Uber authentication (manual login), debugging automation scripts, or watching the automation run. Default: headless mode. |

Example `.env`:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
HEADFUL=true
```

## Development

```bash
# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server on port 3000 |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm check-types` | Type check with TypeScript |
| `pnpm format` | Format code with Prettier |

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI)
- **Forms**: React Hook Form + Zod
- **Browser Automation**: Playwright
- **AI**: Google Gemini (via AI SDK)

## License

Private
