# 🐸 Froggy Pomodoro — Study, Relax & Hop

Welcome to **Froggy Pomodoro**, a cozy and aesthetic productivity web application designed to help you stay focused, manage tasks, and listen to relaxing music alongside Lily, your study-frog mascot.

---

## 🌟 Features

### ⏰ 1. Pond Pomodoro Timer
* **Fully Customizable:** Adjust your work duration, break duration, and total target number of sessions.
* **Cozy Status Tracker:** Keeps track of your active focus cycles and alerts you when it's time to take a break or start studying again.
* **Animated Progress Circular Ring:** Smoothly visualizes the remaining time.

### 📋 2. "Tasks to Hop On" (To-Do List)
* **Persistent Storage:** Connected to a full-stack Flask backend using a SQLite database to save your tasks across sessions.
* **Interactive Completion:** Checking off a task spawns blooming cherry blossoms, accompanied by a happy croak from Lily.

### 📻 3. Froggy Pond Radio (Spotify Integration)
* **Curated Stations:** Quick-switch between four pre-configured ambient playlists (Lofi Focus Beats, Peaceful Piano, Nature Rain Sounds, and Nintendo & Chill).
* **Load Custom Music:** Paste any Spotify track, album, or playlist link to load it dynamically into the built-in media widget.
* **Animated Interactions:** When music starts playing, Lily puts on headphones, bobs her head to the beat, and floating music notes drift across the screen!

### 🌧️ 4. Ambient Sound Engine (Web Audio API)
* Includes built-in custom client-side synthesizers.
* Toggle gentle rain (low-passed white noise), forest rustles (band-passed brown noise with LFO modulation), and organic frog croaking chimes.

### ☁️ 5. Account & Synchronization (SQLite & Cloud Sync)
* **Cross-Device Sync**: Sync your tasks and pomodoro settings across multiple devices using a simple username & password account.
* **Guest Mode Fallback**: If not logged in, the app operates in offline Guest Mode, securely storing your tasks in the browser's `localStorage`.
* **Zero-Config Sync**: Once logged in, your progress is automatically saved to and retrieved from the Flask backend server.

---

## 🛠️ Tech Stack

* **Backend:** Python, Flask, SQLite, Gunicorn (production web server)
* **Frontend:** Vanilla HTML5, Vanilla CSS3 (Glassmorphism, custom layouts), Vanilla JavaScript (ES6)
* **Database & Cloud Storage:** Google Cloud Storage (GCS) mounted via Cloud Storage FUSE (for persistent tasks storage)
* **Deployment Platform:** Google Cloud Run (containerized server running 24/7)
* **Audio:** Web Audio API (Synthesized noises and chimes)
* **Music Integration:** Spotify Web Player Embed API

---

## 🚀 Setup & Installation

### Prerequisites
Make sure you have Python 3 installed on your system.

### Running the App Locally

1. **Clone or Navigate to the directory:**
   ```bash
   cd /Users/makaelaharrell/agy-cli-projects/froggy-pomodoro
   ```

2. **Install Dependencies:**
   ```bash
   python3 -m pip install -r requirements.txt
   ```

3. **Start the Flask Server:**
   ```bash
   python3 app.py
   ```

4. **Access the Web App:**
   Open your browser and navigate to **[http://127.0.0.1:5001](http://127.0.0.1:5001)**.

### ☁️ Cloud Deployment (Google Cloud Run)

The application is deployed to Google Cloud Run and operates 24/7. You can access it directly at:
**👉 [https://froggy-pomodoro-170395053839.us-central1.run.app](https://froggy-pomodoro-170395053839.us-central1.run.app)**

To deploy your own copy of the app:

1. **Prerequisites**: Make sure you have the Google Cloud SDK installed and authenticated.
2. **Enable APIs**: Enable Cloud Run, Cloud Build, and Cloud Storage APIs.
3. **Create GCS Bucket**: Create a GCS bucket to store your SQLite database.
4. **Deploy**:
   ```bash
   gcloud run deploy froggy-pomodoro \
     --source . \
     --region us-central1 \
     --execution-environment gen2 \
     --add-volume name=tasks-db-volume,type=cloud-storage,bucket=YOUR_GCS_BUCKET \
     --add-volume-mount volume=tasks-db-volume,mount-path=/data \
     --set-env-vars DB_PATH=/data/tasks.db \
     --allow-unauthenticated
   ```

---

## 📂 File Structure

* `app.py` — Flask server and SQLite REST API endpoints.
* `templates/index.html` — Main layout.
* `static/css/style.css` — Custom styles, animations, and responsive layout.
* `static/js/app.js` — Timer state machine, Spotify link parser, and audio synthesis engine.
* `static/images/study_frog.jpg` — Cute generated vector illustration of Lily the study frog.
* `requirements.txt` — Python libraries (Flask).
* `.gitignore` — Ignores local databases, caches, and configuration scripts.
