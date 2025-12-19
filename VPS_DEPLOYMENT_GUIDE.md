# 🚀 Ultimate Beginner's Guide to Deploying FlowScale AI

**Goal:** Get your AI website running on the internet.
**Difficulty:** Easy (Just copy & paste!)
**Time:** 10-15 Minutes

---

## 🔑 Step 1: Connect to Your Server (The Black Screen)

We need to control your remote computer (VPS).

1.  **Get your Login Details:**
    -   Go to **Hostinger Dashboard Website**.
    -   Click **VPS** -> **Manage**.
    -   Click the **"SSH Access"** tab.
    -   Look for the **"Terminal Command"** (It looks like `ssh root@123.45.67.89`).
    -   **Copy that command.**

2.  **Open the Terminal:**
    -   **Windows:** Press `Start`, type `PowerShell`, and press Enter.
    -   **Mac:** Press `Cmd+Space`, type `Terminal`, and press Enter.

3.  **Log In:**
    -   Paste the command you copied (Right-click to paste in PowerShell).
    -   Press **Enter**.
    -   It will ask for a **password**. Type your VPS password.
    -   **⚠️ Important:** You will NOT see the characters while typing. Just type it blindly and press **Enter**.
    -   If it asks "Are you sure you want to continue?", type `yes` and press Enter.

🎉 **Success:** You should see a line starting with `root@...`. You are in!

---

## 🏗️ Step 2: Install The Software (One-Time Setup)

*Skip this step if your VPS is not brand new.*

Copy and paste these commands **one by one**. Press **Enter** after each one.

**1. Update the system:**
```bash
sudo apt-get update && sudo apt-get upgrade -y
```

**2. Install Docker (The program that runs your app):**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

**3. Install Git (To download your code):**
```bash
sudo apt-get install -y docker-compose-plugin git
```

---

## 🧹 Step 3: Clean Up (Fresh Start)

If you tried this before, let's delete everything to ensure a clean start.

```bash
docker-compose down
docker system prune -a --volumes -f
cd ~
rm -rf adspark-ai
rm -rf flowscale-ai
```

---

## � Step 4: Download Your Code

**1. Clone the repository:**
```bash
git clone https://github.com/abderrazaqq12/adspark-ai.git
```

**2. Enter the folder:**
```bash
cd adspark-ai
```

---

## ⚙️ Step 5: Configure Settings (The Tricky Part)

We need to set up the secret passwords for your database.

**1. Create the settings file:**
```bash
cp .env.example .env
```

**2. Open the file editor:**
```bash
nano .env
```

**3. Edit the file:**
You will see a text file inside the terminal. Use your **Arrow Keys** to move around.

Change these lines (Delete the old values and type your own):

*   **POSTGRES_PASSWORD**: Type any random strong password.
*   **JWT_SECRET**: Type a long random string (at least 32 characters, like a passwordmash).
*   **VITE_SUPABASE_URL**: Change this to `http://YOUR_VPS_IP:8000` (Replace `YOUR_VPS_IP` with the numbers from Step 1, e.g., `http://89.11.22.33:8000`).

**4. Save and Exit (Pay Attention!):**
-   Press **`Ctrl + X`** (on your keyboard).
-   It will ask "Save modified buffer?". Press **`Y`**.
-   It will verify the filename. Press **`Enter`**.

You should be back at the main command line.

---

## � Step 6: Launch!

This is the magic command that starts everything.

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

**Wait!**
It will take about **2-5 minutes**. You will see lots of text scrolling. This is normal.
Wait until it finishes and gives you the command prompt back.

---

## ✅ Step 7: Did It Work?

Open your browser (Chrome/Safari) and go to:
`http://YOUR_VPS_IP`
(e.g., `http://123.45.67.89`)

**You should see the FlowScale AI Login Page!**

---

## 🔍 Troubleshooting (If things break)

**1. "I can't access the site!"**
Go to your Hostinger Firewall settings and make sure **Port 80** and **Port 443** are accepted (Open).

**2. "It says 502 Bad Gateway"**
The server is probably just starting up. Wait 1 minute and refresh.

**3. "Video generation isn't working"**
You need to add your API keys (OpenAI / Gemini) inside the website now.
Log in -> Go to **Settings** -> Enter Keys.
