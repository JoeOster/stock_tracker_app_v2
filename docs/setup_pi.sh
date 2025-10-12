#!/bin/bash

# Portfolio Tracker V2 - Raspberry Pi Setup Script
# This script automates the installation and configuration of the application.

# --- Helper Functions ---
echo_green() {
    echo -e "\033[0;32m$1\033[0m"
}

echo_red() {
    echo -e "\033[0;31m$1\033[0m"
}

# --- Get User Input ---
echo_green "--- Portfolio Tracker Setup ---"
read -p "Enter your username on this Raspberry Pi (e.g., 'pi'): " PI_USERNAME
read -p "Enter the port number for the application (e.g., 3000): " APP_PORT
read -s -p "Enter your Finnhub API Key: " FINNHUB_API_KEY
echo

# --- 1. System Update ---
echo_green "\n--- Updating system packages... ---"
sudo apt update && sudo apt upgrade -y

# --- 2. Install Dependencies (Git, curl) ---
echo_green "\n--- Installing Git and other tools... ---"
sudo apt install git curl -y

# --- 3. Install Node.js via NVM ---
echo_green "\n--- Installing Node.js (LTS) via NVM... ---"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install --lts
NODE_PATH=$(which node)
echo_green "Node.js installed at: $NODE_PATH"

# --- 4. Clone the Project Repository ---
echo_green "\n--- Cloning the project repository... ---"
cd /home/$PI_USERNAME
git clone https://github.com/JoeOster/stock_tracker_app_v2.git
cd stock_tracker_app_v2

# --- 5. Install Production Dependencies ---
echo_green "\n--- Installing Node.js production dependencies... ---"
npm install --production

# --- 6. Create the .env file ---
echo_green "\n--- Creating the .env file... ---"
cat > .env << EOF
PORT=${APP_PORT}
FINNHUB_API_KEY=${FINNHUB_API_KEY}
NODE_ENV=production
EOF

# --- 7. Create the systemd Service File ---
echo_green "\n--- Creating the systemd service to run the app... ---"
SERVICE_FILE_CONTENT="[Unit]
Description=Portfolio Tracker V2 Web Service
After=network.target

[Service]
Environment=NODE_ENV=production
Type=simple
User=${PI_USERNAME}
WorkingDirectory=/home/${PI_USERNAME}/stock_tracker_app_v2
ExecStart=${NODE_PATH} server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
"
echo "$SERVICE_FILE_CONTENT" | sudo tee /etc/systemd/system/portfolio-tracker.service > /dev/null

# --- 8. Create Backup Script and Directory ---
echo_green "\n--- Creating the backup script... ---"
mkdir -p /home/$PI_USERNAME/portfolio_manager_bu
BACKUP_SCRIPT_CONTENT="#!/bin/bash
SOURCE_DB=\"/home/${PI_USERNAME}/stock_tracker_app_v2/production.db\"
BACKUP_DIR=\"/home/${PI_USERNAME}/portfolio_manager_bu\"
TIMESTAMP=\$(date +\"%Y-%m-%d\")
BACKUP_FILE=\"\$BACKUP_DIR/production-backup-\$TIMESTAMP.db\"
cp \"\$SOURCE_DB\" \"\$BACKUP_FILE\"
"
echo "$BACKUP_SCRIPT_CONTENT" > /home/$PI_USERNAME/stock_tracker_app_v2/backup.sh
chmod +x /home/$PI_USERNAME/stock_tracker_app_v2/backup.sh

# --- 9. Schedule Cron Jobs for Backups ---
echo_green "\n--- Scheduling nightly and reboot backups via cron... ---"
(crontab -l 2>/dev/null; echo "0 0 * * * /home/${PI_USERNAME}/stock_tracker_app_v2/backup.sh") | crontab -
(crontab -l 2>/dev/null; echo "@reboot /home/${PI_USERNAME}/stock_tracker_app_v2/backup.sh") | crontab -

# --- 10. Start and Enable the Service ---
echo_green "\n--- Starting and enabling the Portfolio Tracker service... ---"
sudo systemctl daemon-reload
sudo systemctl start portfolio-tracker
sudo systemctl enable portfolio-tracker

echo_green "\n--- Setup Complete! ---"
echo "The Portfolio Tracker service is now running."
echo "You can check its status with: sudo systemctl status portfolio-tracker"
echo "The application should be accessible at: http://piserver.local:${APP_PORT}"