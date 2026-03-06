# 🚀 Vibe Search — Setup & Deployment Guide

## Stack
- **Next.js 14** (App Router, standalone output)
- **Supabase** (PostgreSQL + Realtime)
- **TypeScript + Tailwind CSS**
- Deployable on **cPanel Node.js Hosting**

---

## 1. Prerequisites

- Node.js 18+
- Supabase account (free tier works)
- cPanel hosting with Node.js Selector

---

## 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase-schema.sql`
3. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (keep this secret!)
4. Go to **Realtime** and ensure the tables are enabled

---

## 3. Local Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your Supabase credentials
nano .env.local

# Run development server
npm run dev
```

Open http://localhost:3000

---

## 4. Build for Production

```bash
npm run build
```

This generates `.next/standalone/` which includes everything needed to run.

---

## 5. Deployment on cPanel (Shared Hosting)

### Step 1: Upload Files

Upload the following to your cPanel File Manager (e.g., `/home/username/vibe-search/`):
```
.next/standalone/          (entire folder)
.next/static/              (copy into standalone/.next/static/)
public/                    (copy into standalone/public/)
```

The final structure in cPanel should be:
```
/home/username/vibe-search/
  server.js              ← entry point
  .next/
    static/
  public/
  node_modules/
```

### Step 2: Configure Node.js Selector in cPanel

1. Go to cPanel → **Node.js Selector** (or "Setup Node.js App")
2. Click **Create Application**
3. Set:
   - **Node.js version**: 18.x or 20.x
   - **Application mode**: Production
   - **Application root**: `/home/username/vibe-search`
   - **Application URL**: your domain or subdomain
   - **Application startup file**: `server.js`
4. Click **Create**

### Step 3: Set Environment Variables

In Node.js Selector, add these env vars:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR...
JWT_SECRET=your-random-32-char-secret
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Step 4: Start the App

Click **Run NPM Install**, then **Restart** the application.

---

## 6. How to Use Vibe Search

### For Game Master (Infokus/Projector):
1. Go to the homepage
2. Click **Buat Room Baru**
3. Enter words (one per line), set timer
4. Click **Buat Room** — you'll be redirected to the Master view
5. Share the **5-character room code** with participants
6. Click **Start Game** when everyone has joined
7. Watch the grid fill with highlights in real-time!

### For Participants (Mobile):
1. Go to homepage → **Gabung Room**
2. Enter your name and the room code
3. Type words you find in the grid, press Enter or ⚡
4. Get vibration feedback on correct answers!
5. Track your score and history in real-time

---

## 7. Architecture Notes

### Grid Generation Algorithm
- Words sorted longest-first for optimal placement
- Backtracking placement with 8 directions (H, V, diagonal ×4, reverse ×4)  
- Grid size auto-calculated: `max(longestWord+2, sqrt(totalChars×1.8), 10)`
- Random letter fill for empty cells
- Up to 5 retry attempts before expanding grid size

### Scoring System
- ≤3 letters: **10 pts**
- 4–5 letters: **20 pts**
- 6–7 letters: **30 pts**
- 8–9 letters: **50 pts**
- 10+ letters: **80 pts**

### Real-time Flow
```
Participant → POST /api/room/submit
  → Validate word (server-side)
  → Update boxes.metadata (isFound, foundBy)
  → Insert into submissions
  → Supabase Realtime fires event
  → Master GridBoard receives event
  → Cells animate with player color + floating name
  → Leaderboard updates
```

---

## 8. Troubleshooting

**WebSocket blocked on shared hosting?**  
Supabase Realtime uses standard WebSocket on port 443 (WSS), which most shared hosts allow. If blocked, check with your host or use Pusher as alternative.

**Grid too small / words don't fit?**  
The algorithm auto-expands. For best results, keep words under 12 characters.

**cPanel shows "Application error"?**  
- Check Node.js version is 18+
- Verify all env vars are set
- Check cPanel error logs

---

## 9. Customization

- **Add more word boxes**: Pass `boxes: [{words: [...], timer: 120}, {words: [...], timer: 90}]` to `/api/room/create`
- **Change grid theme**: Edit `src/app/globals.css` CSS variables
- **Adjust scoring**: Edit `src/lib/scoring.ts`

---

Made with ⚡ by Vibe Search
