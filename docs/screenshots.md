# Screenshots

Every screen of the app, captured from the web build at iPhone 17 size (402 × 874 points at 3×, so 1206 × 2622 pixels) against a mocked API. The wines, prices, sensor readings and download progress are fixtures, so the pictures show every state without a running server.

## Sign in and home

<p>
  <img src="screenshots/01-login.png" width="30%" alt="Login with a one-time email code">
  &nbsp;
  <img src="screenshots/02-home.png" width="30%" alt="Home">
</p>

## Search

Catalog results answer at once and offer a web search for more. Web research shows the stage the model is at, a percentage and a stop button.

<p>
  <img src="screenshots/03-search-results.png" width="30%" alt="Search results from the catalog">
  &nbsp;
  <img src="screenshots/04-search-researching.png" width="30%" alt="Web research in progress with a percentage">
  &nbsp;
  <img src="screenshots/14-label-scan.png" width="30%" alt="Label scanner">
</p>

## A wine

<p>
  <img src="screenshots/05-wine-detail.png" width="30%" alt="Wine detail">
  &nbsp;
  <img src="screenshots/06-cellar-quantity.png" width="30%" alt="Bottle quantity sheet">
  &nbsp;
  <img src="screenshots/07-tasting-form.png" width="30%" alt="Tasting form">
</p>

## Collections

<p>
  <img src="screenshots/08-cellar.png" width="30%" alt="Cellar with climate card">
  &nbsp;
  <img src="screenshots/09-wishlist.png" width="30%" alt="Wishlist">
  &nbsp;
  <img src="screenshots/10-rated.png" width="30%" alt="Rated wines">
</p>

## Settings

<p>
  <img src="screenshots/11-preferences.png" width="30%" alt="Preferences">
  &nbsp;
  <img src="screenshots/12-ai-model.png" width="30%" alt="AI model picker with a download in progress">
  &nbsp;
  <img src="screenshots/13-tuya-sensor.png" width="30%" alt="Tuya sensor connection">
</p>

## Regenerating

The images come from `scripts/screenshots/`, which serves a web export of the app, intercepts every API call with fixtures (`fixtures.mjs`, `mock-api.mjs`), feeds a rendered bottle to the browser's fake camera (`fake-camera.mjs`) and drives the screens with Playwright at the iPhone 17 viewport.

```bash
npx expo export --platform web --output-dir .expo-web-dist
pnpm screenshots
```

Set `CHROMIUM_PATH` when Playwright's own browser is not installed, and `SCREENSHOT_DIR` to write somewhere other than `docs/screenshots`.
