const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

// Google Sheets & Docs Configuration
const GOOGLE_CONFIG = {
  CLIENT_ID: "504652263944-7p3devtl1jenu388jv78l90sigc4cvqr.apps.googleusercontent.com",
  SCOPES: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/documents",
  SHEET_ID: "1lvuB3Cmh4kXrJFdO1NAI9QkEmuXAO8xM0ikXLb9oB9I",
  DOCS_FOLDER_ID: "1PVoQ1INL2pMgO3ijuwSb7AQ-9DZcljZG", // Create a folder in Google Drive for journal entries
};

let accessToken = null;
let tokenClient = null;
let currentWeekStart = getThisMonday();

function getThisMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekDisplay(date) {
  const end = new Date(date);
  end.setDate(end.getDate() + 6);
  const opts = { month: "short", day: "numeric" };
  return `${date.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", opts)}`;
}

function formatSubtitle(date) {
  const end = new Date(date);
  end.setDate(end.getDate() + 6);
  return `${date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`;
}

function changeWeek(dir) {
  saveAll(true);
  currentWeekStart = new Date(currentWeekStart);
  currentWeekStart.setDate(currentWeekStart.getDate() + dir * 7);
  updateWeekDisplay();
  loadWeek();
}

function updateWeekDisplay() {
  document.getElementById("weekDisplay").textContent =
    formatWeekDisplay(currentWeekStart);
  document.getElementById("weekSubtitle").textContent =
    formatSubtitle(currentWeekStart);
}

// ── Build days ───────────────────────────────────────────────────
function buildDays() {
  const grid = document.getElementById("daysGrid");
  grid.innerHTML = "";
  DAYS.forEach((day, di) => {
    const card = document.createElement("div");
    card.className = "day-card";
    card.id = `daycard-${di}`;
    card.innerHTML = `
    <div class="day-header" onclick="toggleDay(${di})">
      <div class="day-left">
        <div class="day-pip" id="pip-${di}"></div>
        <span class="day-name-txt">${day}</span>
      </div>
      <div class="day-right">
        <span class="day-meta" id="dmeta-${di}"></span>
        <i class="ti ti-chevron-down day-chevron" id="chev-${di}"></i>
      </div>
    </div>
    <div class="day-body" id="body-${di}">
      <div class="section-label">To-dos</div>
      <div class="todo-list" id="todos-${di}"></div>
      <button class="add-btn" onclick="addTodo(${di})"><i class="ti ti-plus"></i> add task</button>
      <div class="divider"></div>
      <div class="energy-row">
        <span class="energy-lbl">Energy</span>
        <div class="energy-dots" id="energy-${di}">
          ${[1, 2, 3, 4, 5].map((n) => `<div class="e-dot" data-n="${n}" onclick="setEnergy(${di},${n})" title="${n}/5"></div>`).join("")}
        </div>
      </div>
      <div class="two-col">
        <div class="mini-field">
          <div class="section-label">Best moment</div>
          <textarea id="best-${di}" placeholder="One good thing that happened..."></textarea>
        </div>
        <div class="mini-field">
          <div class="section-label">Challenge</div>
          <textarea id="challenge-${di}" placeholder="What was hard today?"></textarea>
        </div>
      </div>
      <div class="full-field">
        <div class="section-label">Notes</div>
        <textarea id="notes-${di}" placeholder="Anything else on your mind..."></textarea>
      </div>
    </div>
  `;
    grid.appendChild(card);
    addTodo(di, true); // start with one empty row
  });
}

function toggleDay(di) {
  const body = document.getElementById(`body-${di}`);
  const chev = document.getElementById(`chev-${di}`);
  const card = document.getElementById(`daycard-${di}`);
  const open = body.classList.contains("open");
  body.classList.toggle("open", !open);
  chev.classList.toggle("open", !open);
  card.classList.toggle("active", !open);
}

// ── Todos ────────────────────────────────────────────────────────
function addTodo(di, silent = false) {
  const list = document.getElementById(`todos-${di}`);
  const item = document.createElement("div");
  item.className = "todo-item";
  item.innerHTML = `
  <div class="todo-check" onclick="toggleCheck(this, ${di})"></div>
  <textarea class="todo-text" rows="1" placeholder="Add a task..."
    oninput="autoResize(this); updateStats(); updateDayMeta(${di})"></textarea>
`;
  list.appendChild(item);
  if (!silent) item.querySelector("textarea").focus();
  updateStats();
}

function toggleCheck(el, di) {
  el.classList.toggle("done");
  const txt = el.nextElementSibling;
  txt.classList.toggle("done-text", el.classList.contains("done"));
  updateStats();
  updateDayMeta(di);
}

function autoResize(ta) {
  ta.style.height = "auto";
  ta.style.height = ta.scrollHeight + "px";
}

// ── Energy ───────────────────────────────────────────────────────
function setEnergy(di, level) {
  const dots = document
    .getElementById(`energy-${di}`)
    .querySelectorAll(".e-dot");
  dots.forEach((d, i) => {
    d.className = "e-dot";
    if (i < level) {
      d.classList.add(
        level <= 2 ? "el"
        : level === 3 ? "em"
        : "eh",
      );
    }
  });
}

function getEnergy(di) {
  let level = 0;
  document
    .getElementById(`energy-${di}`)
    .querySelectorAll(".e-dot")
    .forEach((d, i) => {
      if (
        d.classList.contains("el") ||
        d.classList.contains("em") ||
        d.classList.contains("eh")
      )
        level = i + 1;
    });
  return level;
}

// ── Reflection lists ─────────────────────────────────────────────
function addListItem(listId, bulletClass, placeholder, value = "") {
  const list = document.getElementById(listId);
  const item = document.createElement("div");
  item.className = "list-item";
  item.innerHTML = `<div class="bullet ${bulletClass}"></div><input class="list-input" placeholder="${placeholder}" value="${value.replace(/"/g, "&quot;")}" oninput="updateStats()">`;
  list.appendChild(item);
  if (!value) item.querySelector("input").focus();
  updateStats();
}

function initReflectionLists() {
  ["winsList", "lossesList", "lessonsList", "gratitudeList"].forEach((id) => {
    document.getElementById(id).innerHTML = "";
  });
  addListItem("winsList", "b-green", "Something that went well...");
  addListItem("winsList", "b-green", "Something you're proud of...");
  addListItem("lossesList", "b-red", "Something that didn't go as planned...");
  addListItem("lossesList", "b-red", "Something you'd handle differently...");
  addListItem("lessonsList", "b-amber", "What did this week teach you?");
  addListItem("gratitudeList", "b-purple", "I'm grateful for...");
}

// ── Rating ───────────────────────────────────────────────────────
function setRating(btn, label) {
  document
    .querySelectorAll(".rate-pill")
    .forEach((b) => b.classList.remove("selected"));
  btn.classList.add("selected");
}

function getRating() {
  const sel = document.querySelector(".rate-pill.selected");
  return sel ? sel.textContent : "";
}

function setRatingByLabel(label) {
  document.querySelectorAll(".rate-pill").forEach((b) => {
    b.classList.toggle("selected", b.textContent === label);
  });
}

// ── Stats ────────────────────────────────────────────────────────
function updateStats() {
  let total = 0,
    done = 0;
  document.querySelectorAll(".todo-text").forEach((t) => {
    if (t.value.trim()) total++;
  });
  document.querySelectorAll(".todo-check.done").forEach(() => done++);
  document.getElementById("totalTodos").textContent = total;
  document.getElementById("completedTodos").textContent = done;
  let wins = 0;
  document.querySelectorAll("#winsList .list-input").forEach((i) => {
    if (i.value.trim()) wins++;
  });
  document.getElementById("totalWins").textContent = wins;
}

function updateDayMeta(di) {
  let count = 0,
    done = 0;
  const list = document.getElementById(`todos-${di}`);
  list.querySelectorAll(".todo-text").forEach((t) => {
    if (t.value.trim()) count++;
  });
  list.querySelectorAll(".todo-check.done").forEach(() => done++);
  document.getElementById(`dmeta-${di}`).textContent =
    count ? `${done}/${count} done` : "";
  document.getElementById(`pip-${di}`).classList.toggle("filled", count > 0);
}

// ── Collect / apply data ─────────────────────────────────────────
function collectData() {
  const data = {
    intention: document.getElementById("weekIntention").value,
    carryForward: document.getElementById("carryForward").value,
    rating: getRating(),
    days: [],
    wins: [],
    losses: [],
    lessons: [],
    gratitude: [],
  };

  DAYS.forEach((_, di) => {
    const todos = [];
    document
      .getElementById(`todos-${di}`)
      .querySelectorAll(".todo-item")
      .forEach((item) => {
        const txt = item.querySelector(".todo-text").value;
        const done = item
          .querySelector(".todo-check")
          .classList.contains("done");
        if (txt.trim()) todos.push({ text: txt, done });
      });
    data.days.push({
      todos,
      energy: getEnergy(di),
      best: document.getElementById(`best-${di}`).value,
      challenge: document.getElementById(`challenge-${di}`).value,
      notes: document.getElementById(`notes-${di}`).value,
    });
  });

  ["wins", "losses", "lessons", "gratitude"].forEach((key) => {
    const listId = key + "List";
    document
      .getElementById(listId)
      .querySelectorAll(".list-input")
      .forEach((i) => {
        if (i.value.trim()) data[key].push(i.value);
      });
  });

  return data;
}

function applyData(data) {
  document.getElementById("weekIntention").value = data.intention || "";
  document.getElementById("carryForward").value = data.carryForward || "";
  if (data.rating) setRatingByLabel(data.rating);

  DAYS.forEach((_, di) => {
    // clear todos
    document.getElementById(`todos-${di}`).innerHTML = "";
    const dayData = data.days && data.days[di];
    if (dayData) {
      if (dayData.todos && dayData.todos.length) {
        dayData.todos.forEach((t) => {
          addTodoWithValue(di, t.text, t.done);
        });
      } else {
        addTodo(di, true);
      }
      if (dayData.energy) setEnergy(di, dayData.energy);
      document.getElementById(`best-${di}`).value = dayData.best || "";
      document.getElementById(`challenge-${di}`).value =
        dayData.challenge || "";
      document.getElementById(`notes-${di}`).value = dayData.notes || "";
    } else {
      addTodo(di, true);
    }
    updateDayMeta(di);
  });

  ["wins", "losses", "lessons", "gratitude"].forEach((key) => {
    const listId = key + "List";
    document.getElementById(listId).innerHTML = "";
    const bulletMap = {
      wins: "b-green",
      losses: "b-red",
      lessons: "b-amber",
      gratitude: "b-purple",
    };
    const phMap = {
      wins: "Something that went well...",
      losses: "Something that didn't go as planned...",
      lessons: "What did this week teach you?",
      gratitude: "I'm grateful for...",
    };
    if (data[key] && data[key].length) {
      data[key].forEach((v) =>
        addListItem(listId, bulletMap[key], phMap[key], v),
      );
    } else {
      addListItem(listId, bulletMap[key], phMap[key]);
      if (key === "wins")
        addListItem(listId, bulletMap[key], "Something you're proud of...");
      if (key === "losses")
        addListItem(
          listId,
          bulletMap[key],
          "Something you'd handle differently...",
        );
    }
  });

  updateStats();
}

function addTodoWithValue(di, text, done) {
  const list = document.getElementById(`todos-${di}`);
  const item = document.createElement("div");
  item.className = "todo-item";
  item.innerHTML = `
  <div class="todo-check${done ? " done" : ""}" onclick="toggleCheck(this, ${di})"></div>
  <textarea class="todo-text${done ? " done-text" : ""}" rows="1"
    oninput="autoResize(this); updateStats(); updateDayMeta(${di})">${text}</textarea>
`;
  list.appendChild(item);
  const ta = item.querySelector("textarea");
  setTimeout(() => autoResize(ta), 0);
}

// ── Save / Load ──────────────────────────────────────────────────

// Initialize Google authentication
function initializeGoogleAuth() {
  google.accounts.id.initialize({
    client_id: GOOGLE_CONFIG.CLIENT_ID,
    callback: handleCredentialResponse,
  });

  google.accounts.id.renderButton(document.getElementById("googleSignIn"), {
    theme: "outline",
    size: "large",
  });
}

function handleCredentialResponse(response) {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CONFIG.CLIENT_ID,
    scope: GOOGLE_CONFIG.SCOPES,
    callback: (tokenResponse) => {
      accessToken = tokenResponse.access_token;
      loadWeekFromSheets();
    },
  });

  if (gapi.client.getToken() === null) {
    tokenClient.requestAccessToken({ prompt: "consent" });
  } else {
    tokenClient.requestAccessToken({ prompt: "" });
  }
}

// Read from Google Sheets
async function loadWeekFromSheets() {
  if (!accessToken || !GOOGLE_CONFIG.SHEET_ID) {
    applyData({});
    return;
  }

  try {
    const weekNum = getWeekNumber(currentWeekStart);
    const range = `Week${weekNum}!A1:Z100`;

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_CONFIG.SHEET_ID}/values/${range}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (response.status === 404) {
      // Sheet doesn't exist, use empty data
      applyData({});
      return;
    }

    if (!response.ok) throw new Error("Failed to read sheet");

    const data = await response.json();
    const parsed = parseSheetData(data.values || []);
    applyData(parsed);
  } catch (error) {
    console.error("Error loading from sheets:", error);
    applyData({});
  }
}

// Write to Google Sheets
async function saveWeekToSheets() {
  if (!accessToken || !GOOGLE_CONFIG.SHEET_ID) {
    return false;
  }

  try {
    const data = collectData();
    const values = formatDataForSheets(data);
    const weekNum = getWeekNumber(currentWeekStart);

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_CONFIG.SHEET_ID}/values/Week${weekNum}!A1?valueInputOption=USER_ENTERED`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values }),
      }
    );

    return true;
  } catch (error) {
    console.error("Error saving to sheets:", error);
    return false;
  }
}

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNumber;
}

// Format data for Google Sheets rows
function formatDataForSheets(data) {
  const rows = [
    ["Weekly Journal Entry", formatWeekDisplay(currentWeekStart)],
    [],
    ["INTENTION FOR THIS WEEK"],
    [data.intention || ""],
    [],
    ["DAILY LOG"],
    [],
  ];

  DAYS.forEach((day, di) => {
    const dayData = data.days[di];
    rows.push([day.toUpperCase()]);
    rows.push(["Todos:"]);
    if (dayData.todos.length) {
      dayData.todos.forEach((t) => {
        rows.push([t.done ? "✓" : "○", t.text]);
      });
    } else {
      rows.push(["-"]);
    }
    rows.push(["Energy:", `${dayData.energy}/5`]);
    rows.push(["Best moment:", dayData.best]);
    rows.push(["Challenge:", dayData.challenge]);
    rows.push(["Notes:", dayData.notes]);
    rows.push([]);
  });

  rows.push(["WEEKLY REFLECTION"]);
  rows.push([]);

  rows.push(["WINS"]);
  if (data.wins.length) {
    data.wins.forEach((w) => rows.push(["•", w]));
  } else {
    rows.push(["-"]);
  }
  rows.push([]);

  rows.push(["LOSSES / THINGS TO IMPROVE"]);
  if (data.losses.length) {
    data.losses.forEach((l) => rows.push(["•", l]));
  } else {
    rows.push(["-"]);
  }
  rows.push([]);

  rows.push(["KEY LESSONS"]);
  if (data.lessons.length) {
    data.lessons.forEach((l) => rows.push(["•", l]));
  } else {
    rows.push(["-"]);
  }
  rows.push([]);

  rows.push(["GRATITUDE & HIGHLIGHTS"]);
  if (data.gratitude.length) {
    data.gratitude.forEach((g) => rows.push(["•", g]));
  } else {
    rows.push(["-"]);
  }
  rows.push([]);

  rows.push(["CARRY FORWARD", data.carryForward || ""]);
  rows.push(["WEEK RATING", data.rating || ""]);

  return rows;
}

// Save to Google Docs with nice formatting
async function saveWeekToGoogleDocs() {
  if (!accessToken || !GOOGLE_CONFIG.DOCS_FOLDER_ID) {
    return null;
  }

  try {
    const data = collectData();
    const docTitle = `Weekly Journal - ${formatWeekDisplay(currentWeekStart)}`;
    const weekNum = getWeekNumber(currentWeekStart);

    // Check if doc already exists
    let docId = await findExistingDoc(docTitle);

    if (!docId) {
      // Create new document
      const createResponse = await fetch(
        "https://docs.googleapis.com/v1/documents",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: docTitle,
            body: {
              content: [{ paragraph: { text: "" } }],
            },
          }),
        }
      );

      if (!createResponse.ok) {
        throw new Error("Failed to create doc");
      }

      const newDoc = await createResponse.json();
      docId = newDoc.documentId;

      // Move to folder
      await moveDocToFolder(docId, GOOGLE_CONFIG.DOCS_FOLDER_ID);
    }

    // Format and update the document
    const requests = formatDocRequests(data);
    await updateDocument(docId, requests);

    return docId;
  } catch (error) {
    console.error("Error saving to Google Docs:", error);
    return null;
  }
}

async function findExistingDoc(title) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${title}' and trashed=false&spaces=drive&pageSize=1`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (response.ok) {
      const result = await response.json();
      return result.files.length > 0 ? result.files[0].id : null;
    }
  } catch (error) {
    console.error("Error finding doc:", error);
  }
  return null;
}

async function moveDocToFolder(docId, folderId) {
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${docId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parents: [folderId],
      }),
    });
  } catch (error) {
    console.error("Error moving doc:", error);
  }
}

async function updateDocument(docId, requests) {
  const response = await fetch(
    `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ requests }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update document");
  }
}

function formatDocRequests(data) {
  const requests = [
    {
      deleteContentRange: { range: { startIndex: 1, endIndex: 1000000 } },
    },
    {
      insertText: {
        text: `Weekly Journal\n${formatWeekDisplay(currentWeekStart)}\n\n`,
        location: { index: 1 },
      },
    },
    {
      updateTextStyle: {
        range: { startIndex: 1, endIndex: 16 },
        textStyle: { bold: true, fontSize: { magnitude: 28, unit: "pt" } },
        fields: "bold,fontSize",
      },
    },
  ];

  let index = 100;

  // Intention section
  requests.push({
    insertText: {
      text: `Intention for this week\n${data.intention || "(not set)"}\n\n`,
      location: { index },
    },
  });

  index += 100;

  // Daily entries
  requests.push({
    insertText: {
      text: `Daily Log\n`,
      location: { index },
    },
  });

  index += 20;

  DAYS.forEach((day, di) => {
    const dayData = data.days[di];
    let dayContent = `\n${day}\n`;

    if (dayData.todos.length) {
      dayContent += `Todos:\n`;
      dayData.todos.forEach((t) => {
        dayContent += `  ${t.done ? "✓" : "○"} ${t.text}\n`;
      });
    }

    dayContent += `Energy: ${dayData.energy}/5\n`;
    dayContent += `Best moment: ${dayData.best}\n`;
    dayContent += `Challenge: ${dayData.challenge}\n`;
    dayContent += `Notes: ${dayData.notes}\n`;

    requests.push({
      insertText: {
        text: dayContent,
        location: { index },
      },
    });

    index += dayContent.length + 50;
  });

  // Reflection section
  requests.push({
    insertText: {
      text: `\n\nWeekly Reflection\n\nWins\n`,
      location: { index },
    },
  });

  index += 50;

  data.wins.forEach((w) => {
    requests.push({
      insertText: {
        text: `• ${w}\n`,
        location: { index },
      },
    });
    index += w.length + 5;
  });

  requests.push({
    insertText: {
      text: `\nThings to Improve\n`,
      location: { index },
    },
  });

  index += 30;

  data.losses.forEach((l) => {
    requests.push({
      insertText: {
        text: `• ${l}\n`,
        location: { index },
      },
    });
    index += l.length + 5;
  });

  requests.push({
    insertText: {
      text: `\nKey Lessons\n`,
      location: { index },
    },
  });

  index += 25;

  data.lessons.forEach((l) => {
    requests.push({
      insertText: {
        text: `• ${l}\n`,
        location: { index },
      },
    });
    index += l.length + 5;
  });

  requests.push({
    insertText: {
      text: `\nGratitude\n`,
      location: { index },
    },
  });

  index += 20;

  data.gratitude.forEach((g) => {
    requests.push({
      insertText: {
        text: `• ${g}\n`,
        location: { index },
      },
    });
    index += g.length + 5;
  });

  requests.push({
    insertText: {
      text: `\nCarry Forward\n${data.carryForward || "(not set)"}\n\nWeek Rating: ${data.rating || "(not rated"}\n`,
      location: { index },
    },
  });

  return requests;
}

// Parse sheet data back into app format (simplified)
function parseSheetData(values) {
  // For now, return empty to start fresh
  // Full implementation would parse the formatted data back
  return {};
}

// Replace saveAll function
async function saveAll(silent = false) {
  if (accessToken) {
    const [sheetsSuccess, docsId] = await Promise.all([
      saveWeekToSheets(),
      saveWeekToGoogleDocs(),
    ]);

    if (!silent) {
      const status = document.getElementById("saveStatus");
      const toast = document.getElementById("toast");

      let message = "✓ Saved";
      if (sheetsSuccess && docsId) {
        message = "✓ Saved to Sheets & Docs";
      } else if (sheetsSuccess) {
        message = "✓ Saved to Sheets (Docs failed)";
      } else if (docsId) {
        message = "✓ Saved to Docs (Sheets failed)";
      } else {
        message = "✗ Save failed";
      }

      status.textContent = message;
      status.classList.add("show");
      toast.textContent = message;
      toast.classList.add("show");
      setTimeout(() => {
        status.classList.remove("show");
        toast.classList.remove("show");
      }, 2000);
    }
  } else if (!silent) {
    alert("Please sign in with Google to save your journal.");
  }
}

// Replace loadWeek function
async function loadWeek() {
  if (accessToken) {
    await loadWeekFromSheets();
  } else {
    applyData({});
  }
}

// Sign out function
function signOut() {
  google.accounts.id.disableAutoCallback();
  accessToken = null;
  applyData({});
}

// ── Init ─────────────────────────────────────────────────────────
function initApp() {
  buildDays();
  updateWeekDisplay();

  // Load Google API client
  gapi.load("client", () => {
    gapi.client.init({
      apiKey: "YOUR_API_KEY",
    });
  });

  // Initialize Google Auth
  window.addEventListener("load", () => {
    initializeGoogleAuth();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}
