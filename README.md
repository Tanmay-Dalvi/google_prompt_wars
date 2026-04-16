# 🏟️ StadiumIQ

> **The AI-Powered Smart Stadium Experience Assistant for Large-Scale Sporting Events.**

## 🚨 The Problem
Attending a match at a massive, 50,000+ seat stadium can be chaotic. Attendees constantly face three major pain points:
1. **Crowd Congestion:** Navigation confusion and bottlenecking at major venue gates.
2. **Missing the Action:** Long, unpredictable waiting times at food courts and restrooms.
3. **Lack of Coordination:** Zero real-time, dynamic communication between venue operations and attendees during emergencies or crowd surges.

## 💡 Our Solution
**StadiumIQ** solves this by unifying real-time crowd intelligence, intuitive maps, and generative AI into a single, mobile-first web interface. StadiumIQ empowers attendees to find the smartest routes to amenities while equally providing stadium staff with a live operational dashboard to manage crowd flow dynamically.

## 🛠️ Google Services Integration
StadiumIQ is built powerfully on the Google Cloud ecosystem:
- **Google Gemini API (gemini-2.5-flash):** Powers the floating AI Assistant that handles natural language queries and generates highly personalized logic-based arrival plans for specific seating blocks.
- **Firebase Realtime Database:** Provides sub-second data synchronization across all attendee devices, securely pushing live crowd wait-times and emergency alerts to the frontend instantly.
- **Google Maps JavaScript API:** Renders a gorgeous, custom-styled satellite map layered with interactive zones to visualize congestion hot-spots.
- **Google Charts:** Visualizes complex operational data into actionable, automatically refreshing donut, line, and bar charts on the hidden "Staff Dashboard."

## ✨ Features
- **Live Venue Map:** Discover key hotspots with map markers that pulse to indicate live wait times and crowd volumes.
- **Real-Time Wait Times Panel:** Color-coded layout showing estimated minutes remaining to access main gates and food halls, updated live via Firebase.
- **Gemini AI Assistant:** A floating, context-aware chatbot offering dynamic tips like "Least crowded food stall" with typing indicators and conversational history.
- **Personal Seat Finder:** Input your exact stand, block, and seat to generate an AI-assisted smart arrival route avoiding bottlenecks.
- **Smart Alerts Banner:** A globally synced flashing top banner distributing vital crowd control or halftime notifications.
- **Live Analytics Dashboard (Staff View):** Role-based analytics giving event coordinators bird's-eye visibility of wait time trends and venue occupancy.

## 🌊 Architecture & Data Flow
StadiumIQ operates seamlessly without complex build tools, directly utilizing Cloud CDNs:
1. **Data Layer:** `Firebase Realtime Database` acts as the single source of truth for crowd times and alerts. 
2. **Presentation:** Built using vanilla HTML5, CSS3, ES6 JavaScript. The `<index.html>` gracefully subscribes to `Firebase.onValue()` listeners.
3. **Intelligence Phase:** The `Gemini 2.5 Flash` model is injected locally with the live stadium context alongside the user's prompt, serving up rapid decision-making dynamically.

## 🚀 Live Demo
You can try StadiumIQ live here: **https://stadiumiq-8x4j2m-as.a.run.app**

## 💻 How to Run Locally
1. Clone this repository to your local machine.
2. Open `index.html` in any text editor.
3. Ensure your Google Maps API Key and Gemini API keys are populated in the `CONFIG` object.
4. Simply double-click `index.html` to open it in Google Chrome or Safari. No `npm`, `node`, or build steps required.

## 📝 Assumptions Made
- Simulated Data: The default data simulates "Horizon Arena" (Pune, India). Simulated crowd fluctuations are actively written to the DB for testing.
- Single-page architecture fits within memory limits of constrained hardware via vanilla JavaScript and raw CSS variables.

## 🔒 Security Practices & Notes
- **API Guarding:** Production keys are deliberately segregated into a clear `CONFIG` object payload to facilitate rapid cycle rotation and environment separation.
- **Firebase Protection:** Current Firebase bindings operate in a supervised 30-day Test rule sandbox but utilize stateless connections.
- **Model Fallbacks:** AI routing includes built-in redundant loops (`gemini-2.5-flash` falls back to `gemini-flash-latest`) to secure against high-demand API throttling incidents.
- **Accessibility:** All UI form inputs contain explicit `aria-label`s, highly legible contrast ratios (`4.5:1`), and fully tap-friendly active states.

## 👥 Team
- **Tanmay Dalvi**
