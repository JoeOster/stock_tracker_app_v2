# Raspberry Pi Production Server Deployment Guide

This guide details the process of migrating the Portfolio Tracker application from a Windows development environment to a dedicated Raspberry Pi production server.

## Phase 1: Raspberry Pi Preparation

... (Steps 1-4 unchanged) ...

## Phase 2: Automated Server Setup

... (Steps 1-3 unchanged) ... \* The script will ask for your GitHub username, the application port (e.g., 3003), and your Finnhub API key.

The script will handle all software installation, cloning the repository, and setting up the application to run as a service.

## Phase 3: Managing the Service

... (Service commands unchanged) ...

## Phase 4: Backups

The setup script automatically configures two backup tasks:

1. A nightly backup at midnight.
2. A backup that runs every time the Raspberry Pi is rebooted.

Backups are stored in the `/home/your_username/portfolio_manager_bu/v3/prod` directory. You do not need to take any further action to manage these.
