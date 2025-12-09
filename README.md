# Browser Automation

A Next.js application for automating browser tasks using Playwright, with AI-powered analysis using Google Gemini.

## Quick Start

Follow these steps to get the project up and running on your local machine.

### 1. Prerequisites

Before you begin, ensure you have the following installed:

| Requirement | Version | Installation                                                                                |
| ----------- | ------- | ------------------------------------------------------------------------------------------- |
| **Node.js** | >= 18.x | [Download from nodejs.org](https://nodejs.org/) or use [nvm](https://github.com/nvm-sh/nvm) |
| **pnpm**    | >= 8.x  | `npm install -g pnpm` or [see pnpm docs](https://pnpm.io/installation)                      |
| **Git**     | Latest  | [Download from git-scm.com](https://git-scm.com/downloads)                                  |

### 2. Clone the Repository

```bash
git clone https://github.com/sayandedotcom/automation.git
cd automation
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Install Playwright Browsers

Playwright requires browser binaries to run automation. Install Chromium:

```bash
pnpm exec playwright install chromium
```

> [!TIP]
> If you encounter permission issues on Linux, you may need to install system dependencies:
>
> ```bash
> pnpm exec playwright install-deps chromium
> ```

### 5. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Then edit `.env` and add your API key:

| Variable                       | Required | Description                                                                                                                |
| ------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | ✅ Yes   | Google Gemini API key for AI-powered screenshot analysis. [Get your key here](https://aistudio.google.com/app/apikey).     |
| `HEADFUL`                      | ❌ No    | Set to `true` to run the browser in visible (headed) mode. Useful for debugging or Uber authentication. Default: headless. |

Example `.env`:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
HEADFUL=true
```

### 6. Start the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. 🎉

---

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

## Available Scripts

| Command            | Description                           |
| ------------------ | ------------------------------------- |
| `pnpm dev`         | Start development server on port 3000 |
| `pnpm build`       | Build for production                  |
| `pnpm start`       | Start production server               |
| `pnpm lint`        | Run ESLint                            |
| `pnpm check-types` | Type check with TypeScript            |
| `pnpm format`      | Format code with Prettier             |

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
