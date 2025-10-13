# Data Injection Tools

This directory contains tools for seeding the development database with sample data.

## Usage

1. **Prepare Your Data**:
    * Open `sample-data.csv` in a spreadsheet editor.
    * Delete the existing sample data and replace it with your own transaction history.
    * The required columns are: `date`, `ticker`, `exchange`, `type`, `quantity`, and `price`.
    * Save your changes.

2. **Run the Injection Script**:
    * From the project's root directory, run the `inject-sample-data.bat` script.
    * You will be prompted to choose whether to delete the existing database. Answer 'Y' for a fresh start or 'N' to add data to the current database.
    * You will be prompted to select which account holder ("Joe" or "Sharon") the data belongs to. The script will automatically create the account holder if they don't already exist.

    ```bash
    .\tools\inject-sample-data.bat
    ```

The script will then process the CSV and inject the data into your `development.db` file.
