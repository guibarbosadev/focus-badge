# 🎯 FocusBadge

**FocusBadge** is a minimalist browser extension that helps you stay focused and accountable during work/study hours — with integrity.

No distractions. No excuses. Just your word and your badge.

---

## 🧠 How It Works

1. **Create a Focus Session**  
   - Define which sites to block (e.g., YouTube, Reddit, etc.)
   - Set the days and time ranges for when these sites should be blocked

2. **Lock the Session**  
   - Once a session starts, the configuration is locked
   - You can only add more sites — no edits or removals allowed

3. **Automatic Server Pings**  
   - During your active focus hours, the extension pings our server hourly
   - If the session is interrupted (disabled, uninstalled, config tampered, etc.) the session is marked as **stained**

4. **Your Public Badge**  
   - Each device has a public badge page
   - It shows last session check time.
   - Use it to prove your focus streak or keep yourself publicly accountable

---

## ✅ Integrity Rules

- You cannot pause a session once started
- Disabling or uninstalling the extension stains the session
- Reinstalling or reactivating with the same device and config hash resumes clean session — if pings were consistent
- You can only add new websites to the config. Removing a site ends the session.


If you really want to stay focused, wear your badge with pride.

---

## 🛠 Tech Stack

- JavaScript / WebExtension APIs
- Node.js + Express (server)
- RESTful API
- Device-based session tracking

## ✅  Minimal Version Checklist

### 🔌 Offline Functionality (Client-side only)

#### 💾 Session Setup (Local)
- [ ] Save blocked sites list (locally)
- [ ] Save custom device name
- [ ] Save blocking time range
- [ ] Generate a config hash (based on deviceId + config)

#### 🚫 Site Blocking Logic
- [ ] Block based on site list
- [ ] Allow subdomain blocking (`*.domain.com`)
- [ ] Block only during defined time range
- [ ] Beautify the block page (custom HTML/CSS)

#### 🔒 Session Rules & Integrity
- [ ] Lock config after session starts (no edits allowed)
- [ ] Allow only *new* domains to be added to block list
- [ ] Prevent "pause" or reconfiguration during session
- [ ] Detect reactivation (on re-enable/extension reload)
- [ ] Store session info locally (even when offline)
- [ ] Handle reboots or computer off scenarios gracefully

---

### 🌐 Backend Integration (API required)

#### 🆕 Session Management
- [ ] `POST /sessions/start` — Save new session
- [ ] `POST /sessions/:id/send-ping` — Hourly ping to confirm session is alive
- [ ] `POST /sessions/:id/mark-ok` — Mark session as successfully completed
- [ ] `POST /sessions/:id/mark-stained` — Mark session as failed/interrupted
- [ ] `POST /sessions/validate` — Extension checks if it should stain a session (e.g. on startup/reactivation)

#### 📛 Public Badge
- [ ] `GET /u/:deviceId` — Show public session status
- [ ] Dynamic return HTML(/session/:sessionHash) returning  session status: `ok`, `stained`, `none`, as well the last check time
