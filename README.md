# CampusLoop: Campus Lost-and-Found & Borrowing Hub
FSD Capstone by Mohit Raj and Manas H. Doshi. Stack: React (Vite), Node.js, Express 5, MongoDB (Mongoose), JWT.

## Features (maps to the synopsis)
| Synopsis module | Where it lives |
|---|---|
| User authentication | `backend/src/routes/auth.js`, `frontend/src/pages.jsx` (AuthPage), JWT + bcrypt |
| Lost & found / borrowing board | `backend/src/routes/listings.js`, Browse, Detail, ListingForm pages |
| Search & filters | `GET /api/listings?q=&type=&category=&status=` |
| Claim / borrow workflow | `backend/src/routes/requests.js` (pending, accepted, rejected, completed) |
| My dashboard | Dashboard page: my listings, incoming and outgoing requests |
| Basic admin tools | `backend/src/routes/admin.js`: report, remove, dismiss |

Extras: image upload (Cloudinary), rate limiting, Helmet security headers, input validation, contact email shared only after a request is accepted, automated tests.

## 1. Run locally
Requirements: Node 18+ and a free MongoDB Atlas cluster.
```
cd backend
cp .env.example .env        # fill MONGO_URI, JWT_SECRET (any long random text), ADMIN_EMAIL
npm install
npm run seed                # optional demo data
npm run dev                 # API on http://localhost:5000
```
Second terminal:
```
cd frontend
npm install
npm run dev                 # app on http://localhost:5173
```
Register with the email you set as `ADMIN_EMAIL` to get the admin role.
Seed logins (password `Demo@1234`): admin@campusloop.test, mohit@campusloop.test, manas@campusloop.test.
Seed accounts are for local demos only. Do not seed your production database.

## 2. Test
```
cd backend
npm test           # offline checks (no database needed)
npm run smoke      # full end-to-end flow; needs the API running (npm run dev)
```
Manual test cases are in `docs/TESTING_AND_DEMO.md`.

## 3. Deploy (free tiers)
1. **MongoDB Atlas**: create an M0 cluster, add a database user, under Network Access allow `0.0.0.0/0`, copy the connection string (add `/campusloop` before the `?`).
2. **GitHub**: push this folder to a new repo (`.env` is git-ignored).
3. **Render (API)**: New > Web Service > your repo. Root directory `backend`, build `npm install`, start `npm start` (or use the included `render.yaml` Blueprint). Add env vars: `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`. Add the Cloudinary vars if you want photo upload. Note your URL, e.g. `https://campusloop-api.onrender.com`. Check `/api/health`.
4. **Vercel (client)**: Import the repo. Root directory `frontend`, preset Vite. Add env var `VITE_API_URL` = your Render URL with no trailing slash. Deploy.
5. **Connect**: on Render set `CORS_ORIGIN` = your Vercel URL (no trailing slash), then redeploy. To allow several origins, separate them with commas.
6. Open the Vercel URL, register with `ADMIN_EMAIL`, and run `API_URL=https://your-api.onrender.com npm run smoke` from `backend/` to verify production.

Render's free tier sleeps when idle; open the API URL a few minutes before a demo.

## 4. Architecture in one minute
Browser (React) calls the REST API with `Authorization: Bearer <JWT>`. Express routes validate input, `protect` middleware loads the user from the token, controllers use Mongoose models (User, Listing, Request). Ownership is checked on the server for every edit, delete and request decision. A request moves pending > accepted > completed (or rejected); accepting also updates the listing status and auto-rejects other pending requests.

## 5. Troubleshooting
- `MongoDB connection failed`: wrong URI, password special characters not URL-encoded, or Atlas IP access not open.
- Browser shows CORS error: `CORS_ORIGIN` on the API must exactly equal the client URL.
- Client calls the wrong API in production: `VITE_API_URL` must be set in Vercel, then redeploy.
- Photo upload says not configured: add the three Cloudinary env vars.

### Vercel shows a blank page or "n.map is not a function"
`VITE_API_URL` is missing or wrong. In Vercel: Project > Settings > Environment Variables, add `VITE_API_URL` = your Render URL (e.g. `https://campusloop-api.onrender.com`, no trailing slash), then Deployments > Redeploy. Vite reads this value at build time, so a redeploy is required after changing it.
