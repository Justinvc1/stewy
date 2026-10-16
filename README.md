# Stewy for StackBlitz

## Start
1. Unzip this archive.
2. Open a Node.js / WebContainers project in StackBlitz.
3. Upload the extracted files and folders, with package.json at the project root.
4. Run `npm start` if it does not start automatically. Open the preview on port 3000.
No npm packages or build step are required. Use `npm test` for the automated checks.

## Included
Worldwide sample layover planner, restaurants/activities/events, local saved items and preferences, time zones, hotel/airport deadlines and contingency buffers. Original images and Google integration source are included.
This is a standalone development copy; your existing hosted Stewy site is unchanged.

## Google integration status
Google billing/API-key activation was not completed at export. This edition deliberately returns configured:false from /api/google/status and disables paid Google requests. StackBlitz WebContainers run in the browser, so this is not a secure production server for a shared Google secret. Do not paste an API key into this project.
`lib/google.mjs` contains the server-side Places/Routes implementation for use on a real backend. `public/google-ui.mjs` contains its client. Deploy the backend with verified authentication, same-origin protection or a carefully configured CORS policy, rate limits and server-managed secrets before enabling live results. Replace the Sites identity-header dependency with verified sessions; do not trust user-supplied oai-authenticated-user-id headers.
Google Cloud project: stwey-511422. Enable Places API (New) and Routes API and complete billing there. Keep existing Skillyspace services unchanged.

## Limits
All sample recommendations, event listings, weather and traffic scenarios remain illustrative. No background notifications or live location tracking. Google results were tested with mocks only. StackBlitz browser operation was not directly tested; Node startup, static HTTP delivery and automated tests were checked locally.

## Main files
- public/app.mjs: interface
- public/planner.mjs: sample timing model
- public/data.mjs and world.mjs: sample data and destination support
- public/google-ui.mjs: Google client view
- lib/google.mjs: backend integration reference (not exposed as a live endpoint here)
- server.mjs: dependency-free preview server
