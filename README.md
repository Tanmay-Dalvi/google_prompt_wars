# 🏟️ StadiumIQ
> **AI-Powered Smart Stadium Experience Assistant — Built for PromptWars Virtual Hackathon by Google for Developers x Hack2Skill**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Cloud%20Run-blue?style=for-the-badge&logo=google-cloud)](https://stadiumiq-1056518431797.asia-south1.run.app/)
[![GitHub](https://img.shields.io/badge/Repo-GitHub-black?style=for-the-badge&logo=github)](https://github.com/Tanmay-Dalvi/google_prompt_wars)

---

## 🎯 Challenge Vertical
**Large-Scale Sporting Events** — Designing a solution that improves the 
physical event experience for attendees at large-scale sporting venues by 
addressing crowd movement, waiting times, and real-time coordination.

---

## 🚨 The Problem
Attending a match at a massive 50,000+ seat stadium like Horizon Arena, 
Pune is an exciting but often chaotic experience. Attendees face three 
critical pain points:

1. **Crowd Congestion** — Navigation confusion and dangerous bottlenecking 
   at major venue gates, especially during entry and halftime.
2. **Missing the Action** — Long, unpredictable waiting times at food 
   courts and restrooms with no visibility into which queues are shortest.
3. **Zero Coordination** — No real-time, dynamic communication between 
   venue operations and 50,000 attendees during emergencies, crowd surges, 
   or schedule changes.

---

## 💡 The Solution — StadiumIQ
**StadiumIQ** is a real-time, AI-powered stadium companion that unifies 
live crowd intelligence, Google Maps navigation, and generative AI into a 
single mobile-first web interface — no app install required.

It serves two audiences simultaneously:
- **Attendees** — Find shortest routes, least crowded food stalls, and 
  get a personalized AI arrival plan for their exact seat.
- **Stadium Staff** — Monitor live occupancy, gate flow, and wait time 
  trends on a real-time operational dashboard.

---

## 🛠️ Google Services Integration

| Service | How It's Used |
|---|---|
| **Firebase Realtime Database** | Single source of truth for live wait times and emergency alerts — pushes sub-second updates to all connected devices simultaneously via `onValue()` listeners |
| **Google Maps JavaScript API** | Renders a custom-styled satellite map of Horizon Arena with interactive zone markers that pulse to show congestion level — red, amber, or green |
| **Google Gemini API (gemini-2.5-flash)** | Powers the floating AI assistant for natural language crowd queries AND generates personalized seat-specific arrival plans with live stadium context injected into every prompt |
| **Google Charts** | Renders the Staff Dashboard with auto-refreshing donut (venue occupancy), line (wait time trends), and bar (gate flow) charts pulling live Firebase data |
| **Google Cloud Run** | Hosts the entire application as a containerized nginx service with a public HTTPS URL — zero cold-start cost, globally available |

---

## ✨ Features

### For Attendees
- **Live Venue Map** — Google Maps with color-coded pulsing markers showing 
  real-time congestion at gates, food courts, restrooms, and parking
- **Real-Time Wait Times Panel** — Color-coded cards (green/amber/red) for 
  every key zone, updated live from Firebase every time data changes
- **Gemini AI Chat Assistant** — Floating chatbot with quick-tap prompts 
  like "Least crowded food stall" and "Shortest route to my seat" — 
  context-aware with full conversation history
- **Personal Seat Finder** — Enter your stand, row, and seat number to get 
  a Gemini-generated smart arrival plan avoiding current bottlenecks
- **Smart Alerts Banner** — Firebase-powered global notification strip that 
  staff can update instantly to redirect crowds during surges or emergencies

### For Stadium Staff
- **Live Analytics Dashboard** — Toggle "Staff View" to access:
  - Venue Occupancy donut chart by section
  - Gate Flow bar chart (last 60 minutes, per 15-min interval)
  - Wait Time Trends line chart across all key zones
- **Live Crowd Surge Simulation** — Change any Firebase value and watch 
  every connected attendee device update in under one second

---

## 🌊 Architecture & Data Flow
Firebase Realtime DB
│
│  onValue() listeners (real-time push)
▼
index.html (Vanilla JS)
│
├── Google Maps API → renders venue map + zone overlays
├── Google Charts → renders staff dashboard panels
└── Gemini API → AI assistant + seat arrival planner
│
└── Live stadium context injected into every prompt
(current wait times + user's seat location)

**No build tools. No npm. No framework.** A single `index.html` served 
via nginx on Cloud Run — fast, lean, and fully auditable.

---

## 🚀 Live Demo
**[https://stadiumiq-1056518431797.asia-south1.run.app/](https://stadiumiq-1056518431797.asia-south1.run.app/)**

> Try it: Open the AI assistant and ask *"Which gate has the least crowd 
> right now?"* or enter seat `South Stand / A / 100` in the Seat Finder.

---

## 💻 How to Run Locally
```bash
git clone https://github.com/Tanmay-Dalvi/google_prompt_wars.git
cd google_prompt_wars
```
1. Open `index.html` in any text editor
2. Find the `CONFIG` object at the top of the `<script>` tag
3. Replace the placeholder values with your own:
   - `MAPS_API_KEY` — Google Maps JavaScript API key
   - `GEMINI_API_KEY` — Google AI Studio key
   - `firebaseConfig` — your Firebase project config object
4. Double-click `index.html` to open in Chrome — no server needed

---

## 📝 Assumptions Made
- **Venue** — Horizon Arena, Pune (50,000-seat cricket stadium) used as 
  the real-world scenario
- **Crowd Data** — Firebase Realtime Database seeded with simulated wait 
  times that fluctuate realistically using a random-walk algorithm; in 
  production this would connect to IoT sensors or ticketing gate APIs
- **Authentication** — Firebase operates in 30-day test mode for 
  hackathon purposes; production would add Firebase Security Rules with 
  role-based staff vs. attendee access
- **Map Markers** — Zone coordinates are manually placed for demo; 
  production would use actual venue GeoJSON boundaries
- **Single File Architecture** — Entire app in one `index.html` to stay 
  under the 1 MB repository size limit required by the hackathon

---

## 🔒 Security Practices
- All API keys isolated in a single `CONFIG` block at the top of the 
  script — easy to rotate, never scattered through logic code
- Firebase Realtime Database in supervised test mode with connection 
  state monitoring and graceful offline fallback
- Gemini API calls include try/catch with fallback to secondary model 
  (`gemini-flash-latest`) if primary is throttled
- No user data stored — the app is fully stateless on the client side
- All interactive elements have `aria-label` attributes, contrast ratio 
  ≥ 4.5:1, and keyboard navigability for accessibility compliance

---

## 👤 Author
**Tanmay Dalvi**
Built for **PromptWars Virtual** — Google for Developers x Hack2Skill
