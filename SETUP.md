# Google Sheets & Docs Integration Setup Guide

Your journal will save to **both**:
- **Google Docs** - Beautiful, readable formatted entries
- **Google Sheets** - Structured data and statistics

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (click on the project selector at the top)
3. Name it "Weekly Journal"
4. Wait for the project to be created

## Step 3: Enable Google APIs

1. In the Cloud Console, search for "Google Sheets API" and enable it
2. Search for "Google Docs API" and enable it
3. Search for "Google Drive API" and enable it

## Step 4: Create OAuth 2.0 Credentials

1. Go to "Credentials" in the left sidebar
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" user type
   - Fill in basic info (app name, user support email, etc.)
   - Add scopes: Search for and select:
     - `https://www.googleapis.com/auth/spreadsheets`
     - `https://www.googleapis.com/auth/documents`
     - `https://www.googleapis.com/auth/drive`
4. After configuring consent screen, create credentials again:
   - Application type: **Web application**
   - Name: "Weekly Journal Web"
   - Authorized JavaScript origins:
     - `http://localhost:8000` (for local testing)
     - Your domain (if hosting online)
   - Authorized redirect URIs: (leave empty for implicit flow)
5. Copy the **Client ID** (looks like: `xxx.apps.googleusercontent.com`)

## Step 4: Create the Google Sheet Template

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Rename it to "Weekly Journal Stats"
4. The sheet will automatically have a "Sheet1" tab
5. Copy the **Sheet ID** from the URL (between `/d/` and `/edit`)
   - Example: `https://docs.google.com/spreadsheets/d/1ABC123xyz.../edit`
   - The ID is: `1ABC123xyz...`

## Step 5: Create a Google Drive Folder for Docs

1. Go to [Google Drive](https://drive.google.com)
2. Click "New" → "Folder"
3. Name it "Weekly Journals"
4. Open the folder and copy the **Folder ID** from the URL
   - Example: `https://drive.google.com/drive/folders/1XYZ456abc...`
   - The ID is: `1XYZ456abc...`

## Step 6: Update your code

Open `weekly-journal.js` and find the `GOOGLE_CONFIG` object (near the top):

```javascript
const GOOGLE_CONFIG = {
  CLIENT_ID: "YOUR_CLIENT_ID.apps.googleusercontent.com",
  SCOPES: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents",
  SHEET_ID: "YOUR_SHEET_ID",
  DOCS_FOLDER_ID: "YOUR_DOCS_FOLDER_ID",
};
```

Replace:
- `YOUR_CLIENT_ID` with the Client ID from Step 4
- `YOUR_SHEET_ID` with the Sheet ID from Step 4
- `YOUR_DOCS_FOLDER_ID` with the Folder ID from Step 5

Example:

```javascript
const GOOGLE_CONFIG = {
  CLIENT_ID: "123456789-abc123def456.apps.googleusercontent.com",
  SCOPES: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents",
  SHEET_ID: "1mE2x_QvXqpLz8N9vK_2QmR_3Ab",
  DOCS_FOLDER_ID: "1XYZ456abc789def012ghi345jkl",
};
```

## Step 7: Test it out

1. Open `weekly-journal.html` in a browser
2. You should see a "Sign in with Google" button in the top right
3. Click it and authorize the app with all permissions
4. Fill in your journal entries
5. Click "Save journal" - it should save to:
   - **Google Docs** - A formatted, readable entry
   - **Google Sheets** - Structured data for stats

## Troubleshooting

**"Error: popup blocked"** - Your browser is blocking the sign-in popup. Allow popups for this site.

**"Invalid Client ID"** - Make sure you copied the full Client ID correctly from Google Cloud Console.

**"Sheet not found"** or **"Folder not found"** - Check that the IDs are correct. They should be just the ID part of the URLs.

**"403 Forbidden"** - The app doesn't have permission. Make sure:
- You authorized with the same Google account that owns the sheets/folder
- All three APIs are enabled (Sheets, Docs, Drive)
- The folder is accessible by your account

**"Docs save failed but Sheets worked"** - Check that the Drive API is enabled and the folder ID is correct.

## Optional: Deploy to the web

When you're ready to host this online:

1. Add your domain to the OAuth credentials (Authorized JavaScript origins)
2. Share the Google Sheet and Drive folder with appropriate access levels
3. Host the files on a web server
