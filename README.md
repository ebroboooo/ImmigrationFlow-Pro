# ClientFlow CRM

ClientFlow CRM is a modern, production-ready customer relationship management platform designed for freelancers, agencies, sales teams, consultants, service businesses, and SMEs.

## Installation

```bash
npm install
```

## Running Locally

```bash
npm run dev
```

## Building for Production

```bash
npm run build
```

## Deployment

### Vercel
1. Push this repository to GitHub.
2. Import the project in Vercel.
3. Vercel will automatically detect the Vite framework and configure the build settings.
4. Deploy!

### Firebase Hosting
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting` (Select the `dist` folder as the public directory)
4. Deploy: `firebase deploy --only hosting`

## Features
- **Dashboard**: KPI cards, widgets, charts.
- **Lead Management**: List view, timeline, filters.
- **Deal Management**: Kanban board with drag-and-drop.
- **Customer Management**: Profiles, timelines.
- **Task Management**: Checklists, due dates.
- **Portfolio Mode**: Instant demo data generation.
