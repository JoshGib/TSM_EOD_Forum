# TSM Forum Frontend

A modern, responsive web application for trading discussions and market insights. TSM Forum empowers first-time investors with accessible financial information, daily market summaries, and community discussions.

## Features

- 📱 **Fully Responsive Design** - Optimized for desktop, tablet, and mobile devices
- 🔍 **Search Functionality** - Search through forum posts and discussions
- 👤 **User Authentication** - Secure login and signup system
- 📊 **EOD Reports** - Daily end-of-day market reports summarized from The Wall Street Journal
- 💬 **Forum Discussions** - Structured discussions for community learners
- 📚 **Educational Resources** - Curated content and trading app links for beginners
- 🎯 **Responsive Navigation** - Mobile-friendly hamburger menu with search integration

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) 14+ with App Router
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Icons**: [Lucide React](https://lucide.dev)
- **State Management**: React Context API
- **Package Manager**: pnpm

## Getting Started

### Prerequisites
- Node.js 16.x or higher
- pnpm (recommended) or npm/yarn

### Installation

1. Clone the repository and navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
pnpm install
# or
npm install
```

3. Run the development server:
```bash
pnpm dev
# or
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

The application auto-refreshes as you edit files in `app/`.

## Project Structure

```
frontend/
├── app/
│   ├── components/          # Reusable UI components
│   │   ├── Navigation.tsx    # Header with search and mobile menu
│   │   ├── LayoutClient.tsx  # Client-side layout wrapper
│   │   ├── HomeComponent.tsx # Home page content
│   │   └── ...
│   ├── contexts/            # React Context providers
│   │   └── AuthContext.tsx   # Authentication context
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── globals.css          # Global styles
│   └── [page]/              # Dynamic routes (rules, forum, etc.)
├── public/                  # Static assets
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── postcss.config.mjs
```

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking

## Features in Detail

### Navigation
- **Desktop View**: Full navigation bar with search, nav items, and user menu
- **Mobile View**: Collapsible hamburger menu with integrated search bar
- **Authentication**: Dynamic menu based on user login status

### Search
- Available on both desktop and mobile views
- Search query passed as URL parameter: `/search?q=query`
- Integrated with navigation for easy access

### Authentication
- Login and signup pages for user management
- Context-based authentication state
- Protected routes and conditional menu items

## Environment Variables

Create a `.env.local` file in the frontend directory:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Deployment

The easiest way to deploy is using [Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme), the platform created by the Next.js team.

For detailed deployment instructions, see [Next.js Deployment Documentation](https://nextjs.org/docs/app/building-your-application/deploying).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is part of the TSM Forum initiative.

