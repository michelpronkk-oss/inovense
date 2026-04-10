# Inovense Social Assets

Static social post system for premium Inovense creative production.

## What this app is

- React + TypeScript Vite app isolated from the main Next.js app.
- Reusable premium templates:
  - Authority Post
  - Service Post
  - Offer Post
  - Quote Post
  - Carousel Slide
- Export-ready 1080x1350, 1080x1080, and 1080x1920 output.

## Run locally

```bash
pnpm --dir social-assets install
pnpm --dir social-assets dev
```

## Build

```bash
pnpm --dir social-assets build
```

## How to edit post content

- Open the studio UI.
- Choose a template and format.
- Edit the `Content JSON` panel.
- Use `Reset` to return to default sample content.
- For carousel templates, adjust the `Slide` control.

## Export

- Click `Export PNG`.
- The app downloads a high-resolution PNG with a template and format filename.

