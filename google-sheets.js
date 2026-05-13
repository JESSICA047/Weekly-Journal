// Google Sheets Configuration
const GOOGLE_CONFIG = {
  CLIENT_ID: "YOUR_CLIENT_ID.apps.googleusercontent.com", // Get from Google Cloud
  SCOPES: "https://www.googleapis.com/auth/spreadsheets",
  SHEET_ID: "YOUR_SHEET_ID", // Your Google Sheet ID from URL
};

let tokenClient;
let accessToken;

// Initialize Google Sign-In
function initializeGoogle() {
  google.accounts.id.initialize({
    client_id: GOOGLE_CONFIG.CLIENT_ID,
    callback: handleSignInResponse,
  });
}

function handleSignInResponse(response) {
  // Extract the access token (requires additional setup)
  requestAccessToken();
}

function requestAccessToken() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CONFIG.CLIENT_ID,
    scope: GOOGLE_CONFIG.SCOPES,
    callback: (response) => {
      accessToken = response.access_token;
      console.log("Access token obtained");
      loadWeek();
    },
  });

  tokenClient.requestAccessToken();
}

function signOut() {
  google.accounts.id.disableAutoCallback();
  accessToken = null;
  localStorage.clear();
}

// Read from Google Sheets
async function loadWeekFromSheets() {
  if (!accessToken) {
    console.log("Not authenticated");
    return null;
  }

  try {
    const range = `Sheet1!A:Z`;
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_CONFIG.SHEET_ID}/values/${range}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) throw new Error("Failed to read sheet");

    const data = await response.json();
    return parseSheetData(data.values);
  } catch (error) {
    console.error("Error loading from sheets:", error);
    return null;
  }
}

// Write to Google Sheets
async function saveWeekToSheets() {
  if (!accessToken) {
    console.log("Not authenticated, save failed");
    return false;
  }

  try {
    const data = collectData();
    const values = formatDataForSheets(data);

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_CONFIG.SHEET_ID}/values/Sheet1!A1?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      },
    );

    if (!response.ok) throw new Error("Failed to save to sheets");
    return true;
  } catch (error) {
    console.error("Error saving to sheets:", error);
    return false;
  }
}

// Format data for Google Sheets rows
function formatDataForSheets(data) {
  const rows = [
    ["Weekly Journal Entry", formatWeekDisplay(currentWeekStart)],
    [],
    ["Intention", data.intention],
    [],
    [
      "Monday",
      "",
      "Tuesday",
      "",
      "Wednesday",
      "",
      "Thursday",
      "",
      "Friday",
      "",
      "Saturday",
      "",
      "Sunday",
    ],
  ];

  // Add daily data
  DAYS.forEach((day, di) => {
    const dayData = data.days[di];
    if (dayData) {
      rows.push([day]);
      if (dayData.todos.length) {
        rows.push(["Todos:"]);
        dayData.todos.forEach((t) => {
          rows.push([t.done ? "✓" : "○", t.text]);
        });
      }
      rows.push(["Energy:", dayData.energy + "/5"]);
      rows.push(["Best moment:", dayData.best]);
      rows.push(["Challenge:", dayData.challenge]);
      rows.push(["Notes:", dayData.notes]);
      rows.push([]);
    }
  });

  // Add reflection sections
  rows.push(["WEEKLY REFLECTION"]);
  rows.push([]);

  const reflectionSections = [
    ["Wins", data.wins],
    ["Losses / Things to Improve", data.losses],
    ["Key Lessons", data.lessons],
    ["Gratitude & Highlights", data.gratitude],
  ];

  reflectionSections.forEach(([title, items]) => {
    rows.push([title]);
    items.forEach((item) => rows.push(["•", item]));
    rows.push([]);
  });

  rows.push(["Carry Forward", data.carryForward]);
  rows.push(["Week Rating", data.rating]);

  return rows;
}

// Parse sheet data back into app format
function parseSheetData(values) {
  if (!values) return null;
  // This is a simplified version - you'd need to parse the formatted data back
  return null;
}

// Replace saveAll function
async function saveAll(silent = false) {
  if (accessToken) {
    const success = await saveWeekToSheets();
    if (!silent) {
      const status = document.getElementById("saveStatus");
      const toast = document.getElementById("toast");
      status.textContent =
        success ? "✓ Saved to Google Sheets" : "✗ Save failed";
      status.classList.add("show");
      toast.classList.add("show");
      setTimeout(() => {
        status.classList.remove("show");
        toast.classList.remove("show");
      }, 2000);
    }
  }
}

// Replace loadWeek function
async function loadWeek() {
  if (accessToken) {
    const sheetData = await loadWeekFromSheets();
    if (sheetData) {
      applyData(sheetData);
      return;
    }
  }
  applyData({});
}
