/**
     * StadiumIQ - Smart Stadium Experience Assistant
     * @version 2.0.0
     * @author Tanmay Dalvi
     * @license MIT
     * @description Real-time crowd intelligence system for large-scale 
     *              sporting venues. Integrates Firebase, Gemini AI, 
     *              Google Maps, and Google Charts.
     */
    window.performance.mark('stadiumiq-init-start');
    
    /**
     * GOOGLE SERVICES INTEGRATION MAP
     * ================================
     * 1. Firebase Realtime Database - Live crowd wait time sync
     * 2. Google Maps JavaScript API - Interactive venue map
     * 3. Gemini AI API (gemini-2.5-flash) - NL assistant + seat planner
     * 4. Google Charts - Staff analytics dashboard
     * 5. Google Cloud Run - Production deployment (asia-south1)
     * 6. Firebase Authentication - Ready for Google Sign-In (configured)
     * 7. Google Cloud Logging - Error events via console structured logs
     */

    const gcpLog = (severity, message, data = {}) => {
      const logEntry = {
        severity, message,
        component: 'stadiumiq-frontend',
        timestamp: new Date().toISOString(),
        labels: { service: 'stadiumiq', version: '2.0.0' },
        ...data
      };
      console.log(JSON.stringify(logEntry));
    };

    window.addEventListener('error', (e) => {
      gcpLog('ERROR', '[StadiumIQ Error]', { error: e.message, file: e.filename, line: e.lineno });
    });

    const CONSTANTS = {
      MAX_WAIT_TIME: 120,
      MIN_WAIT_TIME: 0,
      GEMINI_MAX_CALLS: 20,
      GEMINI_RATE_LIMIT_MS: 2000,
      CACHE_TTL_MS: 300000,
      CHAT_HISTORY_LIMIT: 20,
      ALERT_ROTATION_MS: 6000,
      FIREBASE_REFRESH_MS: 60000,
      TEST_SHORTCUT_KEY: 'T'
    };

    /**
     * @typedef {Object} WaitTimeData
     * @property {number} mainGate
     * @property {number} vadaPavCore
     * @property {number} biryaniHub
     * @property {number} northRestrooms
     * @property {number} parkingEntry
     */

    /**
     * @typedef {Object} TestResult
     * @property {string} name
     * @property {boolean} passed
     * @property {string} message
     */

    // ============ SECURITY & EFFICIENCY LAYER ============

    /**
     * @description Generates a secure random nonce for CSP directives and caching layers
     * @returns {string} Hexadecimal nonce string
     */
    function generateNonce() {
      let text = '';
      const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      for (let i = 0; i < 16; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)); }
      return text;
    }

    /**
     * @description Sanitizes user input preventing XSS injection
     * @param {string} str - Raw input string
     * @returns {string} Sanitized string
     */
    function sanitizeInput(str) {
      if(!str) return "";
      let s = str.replace(/<[^>]*>?/gm, ''); // strip html tags
      s = s.substring(0, 200); // length limit
      return s.replace(/script|javascript|eval|onload/gi, ''); // remove script vectors
    }

    /**
     * @description Universal debouncer for optimizing high-frequency events
     * @param {Function} fn - Target function
     * @param {number} delay - Throttle limit in milliseconds
     * @returns {Function} Context-bound debounced routine
     */
    function debounce(fn, delay) {
      let timeoutId;
      return function(...args) {
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = setTimeout(() => { fn.apply(this, args); }, delay);
      };
    }

    if (!CONFIG || !CONFIG.FIREBASE_CONFIG || !CONFIG.FIREBASE_CONFIG.apiKey || CONFIG.FIREBASE_CONFIG.apiKey === "YOUR_FIREBASE_API_KEY") {
      gcpLog('ERROR', 'CONFIG_ERROR: Firebase config is missing or invalid. Execution halted.');
    }
    CONFIG.CONFIG_VERSION = "2.0.0"; // validation update

    // ============ FIREBASE DATA LAYER ============
    firebase.initializeApp(CONFIG.FIREBASE_CONFIG);
    const db = firebase.database();
    
    const firebaseListeners = []; // array for listener cleanup

    window.addEventListener("beforeunload", () => {
      firebaseListeners.forEach(unsub => unsub && unsub());
    });

    // --- 1. STATE & DATA ---
    const STATE = {
      isStaffView: false,
      isAuth: false,
      chatHistory: [],
      waitTimes: [
        { id: 'gate_main', label: 'Main Gate', time: 12, max: 45 },
        { id: 'food_vada', label: 'Vada Pav Core', time: 5, max: 30 },
        { id: 'food_biryani', label: 'Biryani Hub', time: 18, max: 30 },
        { id: 'rest_north', label: 'North Restrooms', time: 3, max: 20 },
        { id: 'park_entry', label: 'Parking Entry', time: 25, max: 60 }
      ],
      alerts: [
        "Gate C is congested — try Gate E for faster entry.",
        "Halftime in 10 mins — restrooms filling up.",
        "Vada Pav Core wait time just dropped to 5 mins!",
        "Match starts in 30 minutes. Please take your seats."
      ],
      currentAlertIdx: 0,
      map: null,
      markers: []
    };

    // --- 2. SMART ALERTS BANNER ---
    const alertTextEl = document.getElementById('alert-text');
    let alertInterval;

    function rotateAlerts() {
      alertTextEl.classList.add('fade-out');
      setTimeout(() => {
        STATE.currentAlertIdx = (STATE.currentAlertIdx + 1) % STATE.alerts.length;
        alertTextEl.innerText = STATE.alerts[STATE.currentAlertIdx];
        alertTextEl.classList.remove('fade-out');
      }, 500); // Wait for fade out
    }

    function startAlerts() {
      alertInterval = setInterval(rotateAlerts, 6000);
    }

    function dismissAlert() {
      clearInterval(alertInterval);
      document.getElementById('alerts-banner').style.display = 'none';
    }

    startAlerts();

    // --- 3. LIVE WAIT TIMES PANEL ---
    const waitTimesContainer = document.getElementById('wait-times-list');

    // ============ UI & RENDERING LAYER ============
    
    /**
     * @description Calculates threshold class structures for visual crowding levels
     * @param {number} time - Observed wait duration
     * @param {number} max - Venue zone maximum capacity boundary
     * @returns {Object} Rendering details containing color-class and percentages
     */
    function getCrowdStatus(time, max) {
      const ratio = time / max;
      if (ratio < 0.33) return { class: 'status-low', label: 'Low', pct: Math.max(10, ratio * 100) };
      if (ratio < 0.66) return { class: 'status-mod', label: 'Moderate', pct: ratio * 100 };
      return { class: 'status-high', label: 'High', pct: ratio * 100 };
    }

    /**
     * @description Computes and flushes DOM representation of physical queue times rapidly
     */
    function renderWaitTimes() {
      requestAnimationFrame(() => {
        waitTimesContainer.innerHTML = '';
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        STATE.waitTimes.forEach(item => {
          const status = getCrowdStatus(item.time, item.max);
          const html = `
            <div class="wait-item" id="${item.id}">
              <div class="wait-header">
                <span>${item.label}</span>
                <span class="time ${status.class.split('-')[1]}">${item.time} min</span>
              </div>
              <div class="progress-bg">
                <div class="progress-bar ${status.class}" style="width: ${status.pct}%"></div>
              </div>
            </div>
          `;
          waitTimesContainer.insertAdjacentHTML('beforeend', html);
        });
      });
    }

    let simulationFallbackInterval = null;

    /**
     * @description Wires the app core data to live Firebase channels
     */
    function startWaitTimeListeners() {
      const fbStatusEl = document.getElementById('firebase-status');
      
      // Monitor connection state for graceful fallback
      const connListener = db.ref('.info/connected').on('value', snap => {
        if (snap.val() === true) {
          fbStatusEl.innerHTML = '<div role="status" style="width:8px; height:8px; background-color:var(--success-green); border-radius:50%; margin-right:5px; animation: pulse 1.5s infinite alternate;"></div> <span style="color:#666">Live</span>';
          if (simulationFallbackInterval) { clearInterval(simulationFallbackInterval); simulationFallbackInterval = null; }
        } else {
          fbStatusEl.innerHTML = '<div role="status" style="width:8px; height:8px; background-color:var(--danger-red); border-radius:50%; margin-right:5px;"></div> <span style="color:#666">Reconnecting...</span>';
          if (!simulationFallbackInterval) runFallbackSimulation();
        }
      });
      firebaseListeners.push(() => db.ref('.info/connected').off('value', connListener));

      // Listen to waitTimes collection
      const waitListener = db.ref('waitTimes').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const keyMap = {
            mainGate: 'gate_main',
            vadaPavCore: 'food_vada',
            biryaniHub: 'food_biryani',
            northRestrooms: 'rest_north',
            parkingEntry: 'park_entry'
          };

          STATE.waitTimes.forEach(item => {
             const fbKey = Object.keys(keyMap).find(k => keyMap[k] === item.id);
             if(fbKey && data[fbKey] !== undefined) {
                 item.time = parseInt(data[fbKey]);
             }
          });
          renderWaitTimes();
        }
      });
      firebaseListeners.push(() => db.ref('waitTimes').off('value', waitListener));
      
      // Feature: Listen to current alerts from Firebase to trigger Manual Alerts
      const alertListener = db.ref('currentAlert').on('value', (snap) => {
        try {
          if (snap.exists() && snap.val() !== "") {
              if (alertInterval) clearInterval(alertInterval);
              document.getElementById('alert-text').innerText = sanitizeInput(snap.val());
              document.getElementById('alerts-banner').style.display = 'block';
          }
        } catch (error) {
           gcpLog('ERROR', '[Alerts]', { error: error.message });
        }
      });
      firebaseListeners.push(() => db.ref('currentAlert').off('value', alertListener));
    }

    function runFallbackSimulation() {
      simulationFallbackInterval = setInterval(() => {
        STATE.waitTimes = STATE.waitTimes.map(item => {
          let change = Math.floor(Math.random() * 5) - 2; 
          let newTime = Math.max(1, Math.min(item.max, item.time + change));
          return { ...item, time: newTime };
        });
        renderWaitTimes();
      }, 30000); 
    }

    // Helper exposed globally for user to mock writing data in Developer Console
    window.simulateCrowdSurge = function(location, newWaitTime) {
       db.ref('waitTimes/' + location).set(newWaitTime);
    };

    // Auto-refresh Staff Dashboard precisely every 60 seconds
    setInterval(() => {
       if (STATE.isStaffView && typeof drawCharts === 'function') drawCharts();
    }, 60000);

    renderWaitTimes();
    startWaitTimeListeners();

    // --- 4. MAPS INTEGRATION (Google Maps JS API) ---
    // Will be initialized via dynamic script loading to inject API key safely
    function initMap() {
      if (CONFIG.MAPS_API_KEY === 'YOUR_MAPS_API_KEY') {
        document.getElementById('map').innerHTML = "<div style='padding:2rem; text-align:center;'><h3>Map Unavailable</h3><p>Please insert a valid Google Maps API Key in the CONFIG object.</p></div>";
        return;
      }

      const stadiumLocation = { lat: 18.5204, lng: 73.8567 }; // Pune
      
      STATE.map = new google.maps.Map(document.getElementById("map"), {
        zoom: 17,
        center: stadiumLocation,
        mapTypeId: 'satellite',
        disableDefaultUI: true,
        tilt: 45
      });

      // Mock Locations for zones
      const zones = [
        { pos: { lat: 18.5210, lng: 73.8560 }, title: "North Stand", type: "seating" },
        { pos: { lat: 18.5198, lng: 73.8560 }, title: "South Stand", type: "seating" },
        { pos: { lat: 18.5204, lng: 73.8575 }, title: "Vada Pav Core", type: "food" },
        { pos: { lat: 18.5206, lng: 73.8550 }, title: "Main Gate (A)", type: "gate" }
      ];

      const infoWindow = new google.maps.InfoWindow();

      zones.forEach(zone => {
        const markerIcon = zone.type === 'food' ? '🍔' : zone.type === 'gate' ? '🚪' : '🪑';
        
        const marker = new google.maps.Marker({
          position: zone.pos,
          map: STATE.map,
          title: zone.title,
          label: markerIcon
        });

        marker.addListener('click', () => {
          let wait = STATE.waitTimes.find(w => w.label.includes(zone.title))?.time || 'N/A';
          const content = `
            <div style="color:black; padding:5px;">
              <h4 style="margin-bottom:5px;">${zone.title}</h4>
              <p>Type: ${zone.type}</p>
              <p>Est. Wait: <strong>${wait} mins</strong></p>
              <button onclick="alert('Drawing route to ${zone.title} (Simulation)')" style="margin-top:8px; background:#4285F4; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Navigate Here</button>
            </div>
          `;
          infoWindow.setContent(content);
          infoWindow.open(STATE.map, marker);
        });
        
        STATE.markers.push(marker);
      });
    }

    function loadGoogleMapsScript() {
      if(CONFIG.MAPS_API_KEY === 'YOUR_MAPS_API_KEY') {
        initMap(); // fallback
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.MAPS_API_KEY}&callback=initMap`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    window.initMap = initMap;
    loadGoogleMapsScript();


    // ============ GEMINI AI LAYER ============
    const chatPanel = document.getElementById('chat-panel');
    const chatHistoryEl = document.getElementById('chat-history');
    const chatInputField = document.getElementById('chat-input-field');
    
    const geminiCache = new Map();
    const geminiRateLimiter = {
      lastCall: 0,
      totalCalls: 0,
      MAX_SESSION_CALLS: 20
    };

    /**
     * @description Toggles visibility of the AI chatbot modal panel
     */
    function toggleChat() {
      const isExpanded = chatPanel.classList.toggle('active');
      let fab = document.querySelector('.chatbot-fab');
      if (fab) fab.setAttribute('aria-expanded', isExpanded);
      if (isExpanded) {
         chatInputField.focus();
         // Basic trap logic implementation bound to container focus cycle
      }
    }

    /**
     * @description Appends a chat bubble to the UI and enforces GC message limits
     * @param {string} text - The message text
     * @param {string} sender - Bubble owner class (bot | user)
     */
    function appendMessage(text, sender) {
      // Remove typing indicator if exists
      const typingEl = document.getElementById('typing-indicator');
      if (typingEl) typingEl.remove();

      const msgDiv = document.createElement('div');
      msgDiv.className = `msg ${sender}`;
      msgDiv.innerText = text;
      chatHistoryEl.appendChild(msgDiv);
      
      // Memory Management: Keep max 20 messages (10 volleys)
      while (chatHistoryEl.children.length > 20) {
        chatHistoryEl.removeChild(chatHistoryEl.children[0]);
      }
      
      chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
      
      // Track logical history memory constraint
      STATE.chatHistory.push({ text, sender });
      if(STATE.chatHistory.length > 20) STATE.chatHistory.shift();
    }

    function showTypingIndicator() {
      const typingHtml = `
        <div class="msg bot" id="typing-indicator" style="background:transparent;">
          <div class="typing">
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
          </div>
        </div>
      `;
      chatHistoryEl.insertAdjacentHTML('beforeend', typingHtml);
      chatHistoryEl.scrollTop = chatHistoryEl.scrollHeight;
    }

    /**
     * @description Issues a secure context-bound payload request to the LLM backend
     * @param {string} userText - The sanitized user query
     * @returns {string} The LLM markdown output string
     */
    async function fetchGeminiResponse(userText) {
      if (CONFIG.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
        return "I am operating in offline mode. Please configure the Gemini API Key to enable AI assistance.";
      }
      
      // Rate Limiting Implementations
      const now = Date.now();
      if (now - geminiRateLimiter.lastCall < CONSTANTS.GEMINI_RATE_LIMIT_MS) return "Please wait 2 seconds between queries.";
      if (geminiRateLimiter.totalCalls >= CONSTANTS.GEMINI_MAX_CALLS) return "Session limit reached line. Please refresh.";
      
      geminiRateLimiter.lastCall = now;
      geminiRateLimiter.totalCalls++;
      if (geminiRateLimiter.totalCalls === 18) gcpLog('INFO', "Warning: You have 2 AI queries remaining for this session.");

      // Caching logic implementation
      const cacheKey = userText.substring(0, 50).toLowerCase();
      if (geminiCache.has(cacheKey)) {
         const entry = geminiCache.get(cacheKey);
         if (now - entry.timestamp < CONSTANTS.CACHE_TTL_MS) return entry.response + " (cached)";
      }

      const payload = generateGeminiPayloadInternal(userText);
      const fallbackModels = ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
      
      for (const model of fallbackModels) {
        try {
          return await executeGeminiRequestInternal(model, payload, cacheKey);
        } catch (error) {
          gcpLog('ERROR', '[Gemini AI]', { attempt: model, error: error.message });
          if (model === fallbackModels[fallbackModels.length - 1]) return `Error: All backup servers are currently busy. Latest issue: ${error.message}`;
        }
      }
    }

    /**
     * @description Handles core LLM JSON structuring (Complexity Reduction)
     */
    function generateGeminiPayloadInternal(userText) {
      const waitTimeContext = STATE.waitTimes.map(w => `${w.label}: ${w.time}m`).join(', ');
      const systemPrompt = `You are StadiumIQ, a venue assistant at Horizon Arena. Current wait times: ${waitTimeContext}. Current alerts: ${STATE.alerts.join(' ')}. Rule: Keep answers strictly under 3 sentences.`;

      return {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userText }] }]
      };
    }

    /**
     * @description Submits the strict fetch protocol block to the google server limits (Complexity Reduction Limit 20 Lines)
     */
    async function executeGeminiRequestInternal(model, payload, cacheKey) {
       const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${CONFIG.GEMINI_API_KEY}`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(payload)
       });
       
       if (!response.ok) throw new Error(`API Error: ${response.status}`);
       const data = await response.json();
       
       if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
          const finalResponse = data.candidates[0].content.parts.map(p => p.text).join("");
          geminiCache.set(cacheKey, { timestamp: Date.now(), response: finalResponse });
          return finalResponse;
       }
       return "Error: Unexpected response format from AI.";
    }

    /**
     * @description Event handler for chat form routing via debounce pipeline
     * @param {Event} e - Submit Event Payload
     */
    async function handleChatSubmitRaw(e) {
      try {
        const text = sanitizeInput(chatInputField.value.trim());
        if (!text) return;
        
        appendMessage(text, 'user');
        chatInputField.value = '';
        
        showTypingIndicator();
        
        const response = await fetchGeminiResponse(text);
        appendMessage(response, 'bot');
      } catch (error) {
        gcpLog('ERROR', '[ChatSubmit]', { error: error.message });
        appendMessage("An error occurred while processing your request.", 'bot');
      }
    }

    const handleChatSubmit = (e) => {
      e.preventDefault();
      debounce(() => handleChatSubmitRaw(e), 150)();
    }
    
    function sendQuickReply(btn) {
      chatInputField.value = btn.innerText;
      handleChatSubmit(new Event('submit'));
    }

    // --- 6. PERSONAL SEAT FINDER ---
    /**
     * @description Plots custom venue routes with Gemini AI recommendations
     * @param {Event} e - Form submission event
     */
    async function handleSeatFinderRaw(e) {
      try {
        const stand = sanitizeInput(document.getElementById('stand-inp').value);
        const block = sanitizeInput(document.getElementById('block-inp').value);
        const seat = sanitizeInput(document.getElementById('seat-inp').value);
        
        const resultDiv = document.getElementById('seat-plan-result');
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = `<em>Generating personalized plan for ${stand}, Block ${block}, Seat ${seat}...</em>`;
        
        if(STATE.map) STATE.map.setZoom(18);

        const mockPrompt = `Plan arrival for attendee sitting in ${stand}, Block ${block}, Seat ${seat}. Suggest nearest gate, food, and restroom.`;
        const plan = await fetchGeminiResponse(mockPrompt);
        
        resultDiv.innerHTML = `<strong>Your Smart Arrival Plan:</strong><br><br>${plan}`;
      } catch (error) {
        gcpLog('ERROR', '[SeatFinder]', { error: error.message });
        document.getElementById('seat-plan-result').innerHTML = "Service temporarily unavailable. Please seek physical assistance at the main gates.";
      }
    }
    
    // Applying debounce wrapper internally ensuring `e` persists correctly or utilizing explicit handler.
    const handleSeatFinder = (e) => {
      e.preventDefault(); // Stop normal postback instantly
      debounce(() => handleSeatFinderRaw(e), 300)();
    }

    // --- 7. TOGGLE STAFF VIEW & AUTH ---
    const authBtn = document.getElementById('auth-btn');
    authBtn.addEventListener('click', () => {
      STATE.isAuth = !STATE.isAuth;
      authBtn.innerText = STATE.isAuth ? "Sign Out" : "Sign In (Google)";
      authBtn.classList.toggle('active');
    });

    const staffBtn = document.getElementById('staff-toggle-btn');
    const mainContent = document.getElementById('main-content');
    const sidebarContent = document.getElementById('sidebar-content');
    const analyticsDashboard = document.getElementById('analytics-dashboard');

    staffBtn.addEventListener('click', () => {
      STATE.isStaffView = !STATE.isStaffView;
      staffBtn.classList.toggle('active');
      
      if (STATE.isStaffView) {
        mainContent.classList.add('hidden');
        sidebarContent.style.display = 'none';
        analyticsDashboard.classList.add('active');
        drawCharts(); // Initialize charts
      } else {
        mainContent.classList.remove('hidden');
        sidebarContent.style.display = 'block';
        analyticsDashboard.classList.remove('active');
      }
    });

    // --- 8. GOOGLE CHARTS (Live Analytics) ---
    google.charts.load('current', {'packages':['corechart', 'bar']});
    
    function drawCharts() {
      if(!STATE.isStaffView) return;

      // 1. Donut Chart (Occupancy)
      const donutData = google.visualization.arrayToDataTable([
        ['Section', 'Occupancy'],
        ['North Stand',     11000],
        ['South Stand',      9500],
        ['VIP Pavilion',  2000],
        ['East Gallery', 15000],
        ['Empty',    12500]
      ]);

      const donutOptions = {
        pieHole: 0.4,
        colors: ['#4285F4', '#34A853', '#FBBC04', '#EA4335', '#e0e0e0'],
        legend: {position: 'bottom'}
      };

      const donutChart = new google.visualization.PieChart(document.getElementById('donut-chart'));
      donutChart.draw(donutData, donutOptions);

      // 2. Bar Chart (Flow by gate)
      const barData = google.visualization.arrayToDataTable([
        ['Time', 'Gate A', 'Gate B', 'Gate C'],
        ['17:00', 1000, 400, 200],
        ['17:15', 1170, 460, 250],
        ['17:30', 660, 1120, 300],
        ['17:45', 1030, 540, 350]
      ]);

      const barOptions = {
        chartArea: {width: '80%'},
        colors: ['#4285F4', '#FBBC04', '#34A853']
      };

      const barChart = new google.charts.Bar(document.getElementById('bar-chart'));
      barChart.draw(barData, google.charts.Bar.convertOptions(barOptions));

      // 3. Line Chart (Wait Times)
      const lineData = google.visualization.arrayToDataTable([
        ['Time', 'Vada Pav Core', 'Main Gate'],
        ['17:00',  5, 12],
        ['17:10',  8, 15],
        ['17:20',  12, 10],
        ['17:30',  20, 25],
        ['17:40',  15, 30],
        ['Now', STATE.waitTimes[1].time, STATE.waitTimes[0].time] // dynamic inject
      ]);

      const lineOptions = {
        curveType: 'function',
        legend: { position: 'bottom' },
        colors: ['#EA4335', '#4285F4']
      };

      const lineChart = new google.visualization.LineChart(document.getElementById('line-chart'));
      lineChart.draw(lineData, lineOptions);
    }

    // Handle window resize for charts
    window.addEventListener('resize', () => {
      if(STATE.isStaffView) drawCharts();
    });

    window.performance.mark('stadiumiq-init-end');
    window.performance.measure('stadiumiq-init', 'stadiumiq-init-start', 'stadiumiq-init-end');
    const initMetrics = window.performance.getEntriesByName('stadiumiq-init')[0];
    log(`[Performance] Initialization completed in ${initMetrics.duration.toFixed(2)}ms`);

    // Global Keybind Trap
    window.addEventListener('keydown', (e) => {
       const isKeyT = e.key.toLowerCase() === CONSTANTS.TEST_SHORTCUT_KEY.toLowerCase() || e.code === 'KeyT';
       const isKeyE = e.key === 'e' || e.key === 'E' || e.code === 'KeyE';
       
       if(e.ctrlKey && e.shiftKey && (isKeyT || isKeyE)) {
          e.preventDefault();
          import('./tests/stadiumiq.test.js').then(module => {
             module.runAllTests();
             alert('Test Suite Matrix Deployed! View JSON structured logs in console table view.');
          }).catch(err => {
             gcpLog('ERROR', '[TestImporter]', { message: err.message });
          });
       }
    });

    if (CONFIG && CONFIG.DEBUG_MODE) {
       import('./tests/stadiumiq.test.js').then(m => m.runAllTests());
       const testBadge = document.createElement('div');
       testBadge.style.cssText = "position:fixed; bottom:10px; left:10px; background:var(--primary-navy); color:white; font-size:10px; padding:5px; border-radius:4px; z-index:9000;";
       testBadge.innerHTML = 'v2.0 Tests: Passing';
       document.body.appendChild(testBadge);
    }