# Multi-Stores Frontend (React)

React frontend for the Multi-Stores Spring Boot backend.

## Setup

```bash
cd frontend
npm install
```

## Run (development)

1. Start the **backend** (Spring Boot) on `http://localhost:8080`.
2. Start the frontend:

```bash
npm run dev
```

The app will open at `http://localhost:3000`. API requests are proxied to `http://localhost:8080` (see `vite.config.js`).

## Build for production

```bash
npm run build
```

Output is in `dist/`. Serve it with any static server. To call the backend from another origin, configure CORS on the Spring Boot app (e.g. allow your frontend origin).

## Features

- **Home** – list all stores
- **Store page** – view store by slug, list products, add to cart
- **Login / Register** – JWT auth (token in `localStorage`)
- **Cart** – adjust quantities, place order (one order per store)
- **My Orders** – list orders for the logged-in user
- **Create Store** – for OWNER/ADMIN
- **Add Product** – for OWNER/ADMIN

## If you moved the project

If the frontend was created under `OneDrive\...\stores\frontend` and you work from `C:\Users\mylov\projects\stores\`, copy the entire `frontend` folder there:

```text
C:\Users\mylov\projects\stores\frontend
```

Then run `npm install` and `npm run dev` from inside `frontend`.
# jib
