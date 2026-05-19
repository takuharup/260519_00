# Setup Guide

## Prerequisites

- Node.js 18+
- npm 9+

## Install & Run

```bash
cd frame-viewer
npm install
npm run dev
```

Open http://localhost:5173

## Build for Production

```bash
npm run build
npm run preview
```

## Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

## Deploy to Netlify

```bash
npm run build
netlify deploy --prod --dir=dist
```
