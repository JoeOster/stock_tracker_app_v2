# Raspberry Pi Production Server Deployment Guide

This guide details the process of migrating the Portfolio Tracker application from a Windows development environment to a dedicated Raspberry Pi production server.

## Phase 1: Raspberry Pi Preparation

This phase is done on your main Windows/Mac computer.

1.  **Download Raspberry Pi Imager:** Get the official imager from the Raspberry Pi website.
2.  **Flash the OS:**
    * Insert your SD card.
    * Open the Raspberry Pi Imager.
    * Select **Raspberry Pi OS Lite (64-bit)**.
    * Select your SD card.
    * Click the gear icon to open **Advanced Options**:
        * Enable **SSH**.
        * Set a memorable **hostname** (e.g., `piserver`).
        * Create a **username** and a strong **password**.
    * Click **Write** to flash the SD card.
3.  **First Boot:**
    * Eject the SD card and insert it into your Raspberry Pi.
    * Connect the Pi to your router with an Ethernet cable and power it on.
    * Wait a few minutes for it to boot.
4.  **Connect via SSH:**
    * Open PowerShell or Command Prompt on your computer.
    * Connect to the Pi using the username and hostname you set. You will be prompted for your password.
        ```bash
        ssh your_username@piserver.local
        ```

---

## Phase 2: Automated Server Setup

This phase is performed on the Raspberry Pi via your SSH connection.

1.  **Download the Setup Script:**
    * Use `curl` to download the `setup_pi.sh` script from your project's GitHub repository. Make sure to use the "raw" link.
        ```bash
        curl -o setup_pi.sh [https://raw.githubusercontent.com/JoeOster/stock_tracker_app_v2/main/docs/setup_pi.sh](https://raw.githubusercontent.com/JoeOster/stock_tracker_app_v2/main/docs/setup_pi.sh)
        ```
2.  **Make the Script Executable:**
    ```bash
    chmod +x setup_pi.sh
    ```
3.  **Run the Script:**
    * Execute the script. It will guide you through the entire installation and configuration process.
        ```bash
        ./setup_pi.sh
        ```
    * The script will ask for your GitHub username, the application port (e.g., 3000), and your Finnhub API key.

The script will handle all software installation, cloning the repository, and setting up the application to run as a service.

---

## Phase 3: Managing the Service

Once the setup script is complete, your application will be running as a `systemd` service. Here are the essential commands to manage it:

* **Check the status of the service:**
    ```bash
    sudo systemctl status portfolio-tracker
    ```
* **View the live logs:**
    ```bash
    journalctl -u portfolio-tracker -f
    ```
* **Stop the service:**
    ```bash
    sudo systemctl stop portfolio-tracker
    ```
* **Start the service:**
    ```bash
    sudo systemctl start portfolio-tracker
    ```
* **Restart the service (after pulling new code):**
    ```bash
    sudo systemctl restart portfolio-tracker
    ```

---

## Phase 4: Backups

The setup script automatically configures two backup tasks:
1.  A nightly backup at midnight.
2.  A backup that runs every time the Raspberry Pi is rebooted.

Backups are stored in the `/home/your_username/portfolio_manager_bu` directory. You do not need to take any further action to manage these.