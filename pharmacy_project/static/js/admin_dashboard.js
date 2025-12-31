console.log("ADMIN DASHBOARD JS LOADED ✅");

let ALL_APPOINTMENTS = [];

// view state
let currentView = "week"; // week | month | day | list
let offset = 0;           // week/month/day offset

// ============================
// SERVICES FILTER STATE
// ============================
let FILTER_SELECTED_SERVICES = new Set(); // applied
let UI_SELECTED_SERVICES = new Set();     // checkbox ui (before apply)
let SELECTED_APPOINTMENT = null;

function findAppointmentById(id) {
  return (ALL_APPOINTMENTS || []).find(x => String(x.id) === String(id));
}

function openDetailPanel(appt) {
  if (!appt) return;

  const panel = document.getElementById("apDetailPanel");
  if (!panel) return;

  document.getElementById("apDetailTitle").textContent = "Appointment";
  document.getElementById("apDetailDate").textContent = `${appt.date || ""} • ${appt.time || ""}`;

  document.getElementById("apDetailService").textContent = appt.service || "—";
  document.getElementById("apDetailName").textContent =
    appt.name || `${appt.first_name || ""} ${appt.last_name || ""}`.trim();

  document.getElementById("apDetailDob").textContent = appt.dob || "—";
  document.getElementById("apDetailPostcode").textContent = appt.postcode || "—";

  document.getElementById("apDetailEmail").textContent = appt.email || "—";
  document.getElementById("apDetailPhone").textContent = appt.phone || "—";
  document.getElementById("apDetailNhs").textContent = appt.nhs || "—";
  document.getElementById("apDetailNote").textContent =
    (appt.note && appt.note.trim()) ? appt.note : "—";

  panel.classList.add("open");
}

function closeDetailPanel() {
  const panel = document.getElementById("apDetailPanel");
  if (panel) panel.classList.remove("open");
}

// ✅ MASTER SERVICES LIST
const MASTER_SERVICES = Array.isArray(window.BOOKING_SERVICES) && window.BOOKING_SERVICES.length
  ? window.BOOKING_SERVICES
  : [
      "Flu Vaccination (NHS)",
      "Flu Vaccination (Private)",
      "COVID-19 Vaccination (NHS)",
      "COVID-19 Vaccination (Private)",
      "Travel Vaccines Consultation",
      "MMR Vaccine",
      "DTP Vaccine",
      "Hepatitis A Vaccine",
      "Hepatitis B Vaccine",
      "Typhoid Vaccine",
      "Cholera Vaccine",
      "Yellow Fever Vaccine",
      "Japanese Encephalitis Vaccine",
      "Tick Borne Encephalitis Vaccine",
      "MenACWY Vaccine",
      "MenB Vaccine",
      "Dengue Vaccine",
      "Blood Pressure Check",
      "Earwax Removal",
      "Pharmacy First Consultation",
      "Weight Loss Consultation",
      "Private Prescription",
    ];

function splitServices(serviceStr) {
  return String(serviceStr || "")
    .split("+")
    .map(s => s.trim())
    .filter(Boolean);
}

function matchesServiceFilter(appt) {
  if (!FILTER_SELECTED_SERVICES.size) return true; // All
  const parts = splitServices(appt.service);
  for (const p of parts) {
    if (FILTER_SELECTED_SERVICES.has(p)) return true;
  }
  return false;
}

/* ================= DATE HELPERS ================= */

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeek(d) {
  const x = startOfDay(d);
  const day = x.getDay(); // Sun=0
  x.setDate(x.getDate() - day);
  return x;
}

function startOfMonth(d) {
  const x = startOfDay(d);
  x.setDate(1);
  return x;
}

function endOfMonth(d) {
  const x = startOfMonth(d);
  x.setMonth(x.getMonth() + 1);
  return x;
}

function inRange(d, start, end) {
  return d >= start && d < end;
}

function getDayKey(dateObj) {
  return ["sun","mon","tue","wed","thu","fri","sat"][dateObj.getDay()];
}

function parseDMY(str) {
  const [dd, mm, yy] = String(str).split("-").map(Number);
  return startOfDay(new Date(yy, mm - 1, dd));
}

function floorToHour(time) {
  const parts = String(time || "").split(":");
  const h = parts[0] || "00";
  return `${String(parseInt(h, 10)).padStart(2, "0")}:00`;
}

function monthShort(m) {
  return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m];
}

function monthLong(m) {
  return ["January","February","March","April","May","June","July","August","September","October","November","December"][m];
}

function sameDate(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/* ================= UI HELPERS ================= */

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}

function clearAppointmentsBlocks() {
  document.querySelectorAll(".ap-apt").forEach(x => x.remove());
}

function setRangeText(text) {
  const el = document.getElementById("dateRangeText");
  if (el) el.textContent = text;
}

function toggleViews(view) {
  const weekBody = document.getElementById("calendarBody");     // ap-cal-body
  const weekHead = document.querySelector(".ap-cal-head");      // headers row

  const month = document.getElementById("apMonthView");
  const day = document.getElementById("apDayView");
  const list = document.getElementById("apListView");

  // ✅ Week header/body sirf week view me
  if (weekHead) weekHead.style.display = (view === "week") ? "grid" : "none";
  if (weekBody) weekBody.style.display = (view === "week") ? "block" : "none";

  // ✅ Other views containers
  if (month) month.style.display = (view === "month") ? "block" : "none";
  if (day) day.style.display = (view === "day") ? "block" : "none";
  if (list) list.style.display = (view === "list") ? "block" : "none";
}


// ✅ change chip label based on view
function updateThisChipLabel() {
  const chip = document.getElementById("btnThisWeek");
  if (!chip) return;

  if (currentView === "week") chip.textContent = "This week";
  else if (currentView === "month") chip.textContent = "This month";
  else if (currentView === "day") chip.textContent = "This day";
  else if (currentView === "list") chip.textContent = "All";
}

/* ================= MAIN RENDER SWITCH ================= */

function render() {
  clearAppointmentsBlocks();
  toggleViews(currentView);
  updateThisChipLabel();

  if (currentView === "week") return renderWeek();
  if (currentView === "month") return renderMonth();
  if (currentView === "day") return renderDay();
  if (currentView === "list") return renderList();
}

/* ================= DOM READY ================= */

document.addEventListener("DOMContentLoaded", () => {
  const viewBtns = document.querySelectorAll(".ap-view-btn");
  const btnPrev = document.getElementById("btnPrevWeek");
  const btnNext = document.getElementById("btnNextWeek");
  const btnThis = document.getElementById("btnThisWeek");

  const weekGrid = document.getElementById("calendarBody");
  const host = document.querySelector(".ap-calendar"); 

  if (host) {
    if (!document.getElementById("apMonthView")) {
      const month = document.createElement("div");
      month.id = "apMonthView";
      month.style.display = "none";
      host.appendChild(month);
    }
    if (!document.getElementById("apDayView")) {
      const day = document.createElement("div");
      day.id = "apDayView";
      day.style.display = "none";
      host.appendChild(day);
    }
    if (!document.getElementById("apListView")) {
      const list = document.createElement("div");
      list.id = "apListView";
      list.style.display = "none";
      host.appendChild(list);
    }
  }

  initServicesFilterDropdown();

  // ✅ DETAIL PANEL CLOSE BUTTON
  const closeBtn = document.getElementById("apDetailCloseBtn");
  if (closeBtn) closeBtn.addEventListener("click", () => closeDetailPanel());

  // ✅ CLICK OUTSIDE -> CLOSE
  document.addEventListener("click", (e) => {
    const panel = document.getElementById("apDetailPanel");
    if (!panel || !panel.classList.contains("open")) return;

    if (panel.contains(e.target)) return;
    if (e.target.closest(".ap-apt")) return;
    closeDetailPanel();
  });

  // ✅ Clear Filters
  const btnClearFilters = document.getElementById("btnClearFilters");
  if (btnClearFilters) {
    btnClearFilters.addEventListener("click", (e) => {
      e.preventDefault();
      FILTER_SELECTED_SERVICES.clear();
      UI_SELECTED_SERVICES.clear();
      const label = document.getElementById("servicesFilterLabel");
      if (label) label.textContent = "All";
      closeDetailPanel();
      render();
    });
  }

  // ✅ Print
  const btnPrintList = document.getElementById("btnPrintList");
  if (btnPrintList) {
    btnPrintList.addEventListener("click", (e) => {
      e.preventDefault();
      handlePrint();
    });
  }

  // view switch
  viewBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      viewBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      currentView = btn.dataset.view || "week";
      offset = 0;
      closeDetailPanel();
      render();
    });
  });

  // nav
  if (btnPrev) btnPrev.addEventListener("click", () => { offset -= 1; closeDetailPanel(); render(); });
  if (btnNext) btnNext.addEventListener("click", () => { offset += 1; closeDetailPanel(); render(); });
  if (btnThis) btnThis.addEventListener("click", () => { offset = 0; closeDetailPanel(); render(); });

  // fetch appointments
  fetch("/admin-dashboard/appointments/")
    .then(res => res.json())
    .then(data => {
      console.log("APPOINTMENTS API RESPONSE:", data);
      if (data.status !== "ok") return;
      ALL_APPOINTMENTS = data.appointments || [];
      render();
    })
    .catch(err => console.error("APPOINTMENTS FETCH ERROR:", err));
});

/* ============================ SERVICES FILTER DROPDOWN ============================ */

function initServicesFilterDropdown() {
  const btn = document.getElementById("servicesFilterBtn");
  const dd = document.getElementById("servicesFilterDropdown");
  const list = document.getElementById("servicesFilterList");
  const search = document.getElementById("servicesFilterSearch");
  const btnClear = document.getElementById("servicesFilterClear");
  const btnApply = document.getElementById("servicesFilterApply");
  const label = document.getElementById("servicesFilterLabel");

  if (!btn || !dd || !list || !search || !btnClear || !btnApply || !label) {
    console.warn("Services filter dropdown elements not found.");
    return;
  }

  function renderList(filterText = "") {
    const f = String(filterText || "").toLowerCase();
    list.innerHTML = "";

    MASTER_SERVICES
      .filter(s => s.toLowerCase().includes(f))
      .forEach(serviceName => {
        const row = document.createElement("label");
        row.style.display = "flex";
        row.style.alignItems = "center";
        row.style.gap = "10px";
        row.style.padding = "8px 6px";
        row.style.cursor = "pointer";

        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = UI_SELECTED_SERVICES.has(serviceName);

        cb.addEventListener("change", () => {
          if (cb.checked) UI_SELECTED_SERVICES.add(serviceName);
          else UI_SELECTED_SERVICES.delete(serviceName);
          updateLabelPreview();
        });

        const txt = document.createElement("span");
        txt.textContent = serviceName;
        txt.style.fontSize = "13px";
        txt.style.color = "#111827";

        row.appendChild(cb);
        row.appendChild(txt);
        list.appendChild(row);
      });
  }

  function updateLabelPreview() {
    if (!UI_SELECTED_SERVICES.size) label.textContent = "All";
    else label.textContent = `Selected (${UI_SELECTED_SERVICES.size})`;
  }

  function openDD() {
    dd.style.display = "block";
    UI_SELECTED_SERVICES = new Set(FILTER_SELECTED_SERVICES);
    renderList(search.value);
    updateLabelPreview();
  }

  function closeDD() {
    dd.style.display = "none";
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (dd.style.display === "block") closeDD();
    else openDD();
  });

  document.addEventListener("click", () => closeDD());
  dd.addEventListener("click", (e) => e.stopPropagation());

  search.addEventListener("input", () => renderList(search.value));

  btnClear.addEventListener("click", () => {
    UI_SELECTED_SERVICES.clear();
    renderList(search.value);
    updateLabelPreview();
  });

  btnApply.addEventListener("click", () => {
    FILTER_SELECTED_SERVICES = new Set(UI_SELECTED_SERVICES);
    closeDD();
    closeDetailPanel();
    render();
  });

  label.textContent = "All";
}

/* ================= WEEK VIEW ================= */

function renderWeek() {
  const base = startOfWeek(new Date());
  const weekStart = addDays(base, offset * 7);
  const weekEnd = addDays(weekStart, 7);

  renderWeekHeader(weekStart);

  const endDate = addDays(weekStart, 6);
  setRangeText(
    `${monthShort(weekStart.getMonth())} ${weekStart.getDate()} - ${monthShort(endDate.getMonth())} ${endDate.getDate()}, ${endDate.getFullYear()}`
  );

  (ALL_APPOINTMENTS || []).forEach(a => {
    if (!a.date || !a.time) return;
    if (!matchesServiceFilter(a)) return;

    const dateObj = parseDMY(a.date);
    if (!inRange(dateObj, weekStart, weekEnd)) return;

    const dayKey = getDayKey(dateObj);
    const cellTime = floorToHour(a.time);

    const cell = document.querySelector(`.ap-cell[data-day="${dayKey}"][data-time="${cellTime}"]`);
    if (!cell) return;

    const card = document.createElement("div");
    card.className = "ap-apt";
    card.dataset.id = a.id;

    card.innerHTML = `
      <div class="ap-apt-title">${escapeHtml(a.service)}</div>
      <div class="ap-apt-sub">${escapeHtml(a.name)}</div>
      <div class="ap-apt-meta">${escapeHtml(String(a.time).slice(0,5))}</div>
    `;

    card.addEventListener("click", (e) => {
      e.stopPropagation();
      SELECTED_APPOINTMENT = a;
      openDetailPanel(a);
    });

    cell.appendChild(card);
  });
}

function renderWeekHeader(weekStart) {
  const headCells = document.querySelectorAll(".ap-cal-head .ap-cal-head-cell");
  if (!headCells || headCells.length < 8) return;

  const labels = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

  for (let i = 1; i <= 7; i++) {
    const date = addDays(weekStart, i - 1);
    headCells[i].innerHTML = `${labels[i - 1]}<br><strong>${String(date.getDate()).padStart(2, "0")}</strong>`;
  }
}

/* ================= MONTH VIEW ================= */

function renderMonth() {
  const monthBox = document.getElementById("apMonthView");
  if (!monthBox) return;

  const base = startOfMonth(new Date());
  const monthStart = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const monthEnd = endOfMonth(monthStart);

  setRangeText(`${monthLong(monthStart.getMonth())} ${monthStart.getFullYear()}`);

  const start = startOfWeek(monthStart);
  const totalCells = 42;

  monthBox.innerHTML = `
    <div class="ap-month">
      <div class="ap-month-head">
        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
      </div>
      <div class="ap-month-grid" id="apMonthGrid"></div>
    </div>
  `;

  const grid = document.getElementById("apMonthGrid");
  if (!grid) return;

  for (let i = 0; i < totalCells; i++) {
    const d = addDays(start, i);
    const isOtherMonth = d.getMonth() !== monthStart.getMonth();

    const cell = document.createElement("div");
    cell.className = "ap-month-day" + (isOtherMonth ? " muted" : "");
    cell.dataset.date = d.toISOString().slice(0, 10);

    cell.innerHTML = `<div class="ap-month-date">${d.getDate()}</div><div class="ap-month-items"></div>`;
    grid.appendChild(cell);
  }

  (ALL_APPOINTMENTS || []).forEach(a => {
    if (!a.date) return;
    if (!matchesServiceFilter(a)) return;

    const d = parseDMY(a.date);
    if (!inRange(d, monthStart, monthEnd)) return;

    const key = d.toISOString().slice(0, 10);
    const box = grid.querySelector(`.ap-month-day[data-date="${key}"] .ap-month-items`);
    if (!box) return;

    const item = document.createElement("div");
    item.className = "ap-month-item";
    item.textContent = `${String(a.time).slice(0,5)} • ${a.service}`;
    item.style.cursor = "pointer";

    item.addEventListener("click", (e) => {
      e.stopPropagation();
      SELECTED_APPOINTMENT = a;
      openDetailPanel(a);
    });

    box.appendChild(item);
  });
}

/* ================= DAY VIEW (GRID LIKE WEEK) ================= */

function renderDay() {
  const dayBox = document.getElementById("apDayView");
  if (!dayBox) return;

  const base = startOfDay(new Date());
  const dayDate = addDays(base, offset);

  setRangeText(`${dayDate.getDate()} ${monthShort(dayDate.getMonth())}, ${dayDate.getFullYear()}`);

  const slots = [
    { label: "9 AM",  time: "09:00" },
    { label: "10 AM", time: "10:00" },
    { label: "11 AM", time: "11:00" },
    { label: "12 PM", time: "12:00" },
    { label: "1 PM",  time: "13:00" },
    { label: "2 PM",  time: "14:00" },
    { label: "3 PM",  time: "15:00" },
  ];

  dayBox.innerHTML = `
    <div class="ap-cal-head" id="apDayHead">
      <div class="ap-cal-head-cell time"></div>
      <div class="ap-cal-head-cell" id="apDayHeadCell"></div>
    </div>
    <div class="ap-cal-body" id="apDayBody"></div>
  `;

  const head = document.getElementById("apDayHead");
  const headCell = document.getElementById("apDayHeadCell");
  const body = document.getElementById("apDayBody");
  if (!head || !headCell || !body) return;

  head.style.display = "grid";
  head.style.gridTemplateColumns = "80px 1fr";

  const labels = ["SUN","MON","TUE","WED","THU","FRI","SAT"];
  headCell.innerHTML = `${labels[dayDate.getDay()]}<br><strong>${String(dayDate.getDate()).padStart(2, "0")}</strong>`;

  slots.forEach(s => {
    const row = document.createElement("div");
    row.className = "ap-row";
    row.style.display = "grid";
    row.style.gridTemplateColumns = "80px 1fr";
    row.style.minHeight = "60px";

    row.innerHTML = `
      <div class="ap-time">${s.label}</div>
      <div class="ap-cell" data-day="day" data-time="${s.time}"></div>
    `;
    body.appendChild(row);
  });

  (ALL_APPOINTMENTS || [])
    .filter(a => a.date && sameDate(parseDMY(a.date), dayDate))
    .filter(a => matchesServiceFilter(a))
    .forEach(a => {
      const cellTime = floorToHour(a.time);
      const cell = body.querySelector(`.ap-cell[data-day="day"][data-time="${cellTime}"]`);
      if (!cell) return;

      const card = document.createElement("div");
      card.className = "ap-apt";
      card.dataset.id = a.id;

      card.innerHTML = `
        <div class="ap-apt-title">${escapeHtml(a.service)}</div>
        <div class="ap-apt-sub">${escapeHtml(a.name)}</div>
        <div class="ap-apt-meta">${escapeHtml(String(a.time).slice(0,5))}</div>
      `;

      card.addEventListener("click", (e) => {
        e.stopPropagation();
        SELECTED_APPOINTMENT = a;
        openDetailPanel(a);
      });

      cell.appendChild(card);
    });
}

/* ================= LIST VIEW (DOB + NHS) ================= */

function renderList() {
  const listBox = document.getElementById("apListView");
  if (!listBox) return;

  setRangeText("All appointments");

  const items = (ALL_APPOINTMENTS || [])
    .filter(a => matchesServiceFilter(a))
    .slice()
    .sort((a,b) => {
      const da = a.date ? parseDMY(a.date) : new Date(0);
      const db = b.date ? parseDMY(b.date) : new Date(0);
      if (db - da !== 0) return db - da;
      return String(b.time).localeCompare(String(a.time));
    });

  listBox.innerHTML = `
    <div class="ap-list">
      <div class="ap-list-head">
        <div><strong>Date</strong></div>
        <div><strong>Time</strong></div>
        <div><strong>Service</strong></div>
        <div><strong>Name</strong></div>
        <div><strong>DOB</strong></div>
        <div><strong>NHS</strong></div>
        <div><strong>Email</strong></div>
      </div>
      <div class="ap-list-body" id="apListBody"></div>
    </div>
  `;

  const body = document.getElementById("apListBody");
  if (!body) return;

  if (!items.length) {
    body.innerHTML = `<div class="ap-empty">No appointments found.</div>`;
    return;
  }

  items.forEach(a => {
    const row = document.createElement("div");
    row.className = "ap-list-row";
    row.style.cursor = "pointer";

    row.innerHTML = `
      <div>${escapeHtml(a.date || "")}</div>
      <div>${escapeHtml(String(a.time || "").slice(0,5))}</div>
      <div>${escapeHtml(a.service || "")}</div>
      <div>${escapeHtml(a.name || "")}</div>
      <div>${escapeHtml(a.dob || "")}</div>
      <div>${escapeHtml(a.nhs || "")}</div>
      <div>${escapeHtml(a.email || "")}</div>
    `;

    row.addEventListener("click", (e) => {
      e.stopPropagation();
      SELECTED_APPOINTMENT = a;
      openDetailPanel(a);
    });

    body.appendChild(row);
  });
}

/* ================= PRINT HELPERS ================= */

function getFilteredAppointmentsForList() {
  return (ALL_APPOINTMENTS || [])
    .filter(a => matchesServiceFilter(a))
    .slice()
    .sort((a, b) => {
      const da = a.date ? parseDMY(a.date) : new Date(0);
      const db = b.date ? parseDMY(b.date) : new Date(0);
      if (da - db !== 0) return da - db; // ASC
      return String(a.time || "").localeCompare(String(b.time || ""));
    });
}

function handlePrint() {
  // ✅ force list view for printing
  if (currentView !== "list") {
    currentView = "list";
    document.querySelectorAll(".ap-view-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.view === "list");
    });
    render();
  }

  const printArea = document.getElementById("printArea");
  if (!printArea) {
    alert("printArea div missing in HTML");
    return;
  }

  const items = getFilteredAppointmentsForList();
  const title = `Appointments List (${items.length})`;
  const now = new Date().toLocaleString();

  const rowsHtml = items.map(a => `
    <tr>
      <td>${escapeHtml(a.date || "")}</td>
      <td>${escapeHtml(String(a.time || "").slice(0,5))}</td>
      <td>${escapeHtml(a.service || "")}</td>
      <td>${escapeHtml(a.name || "")}</td>
      <td>${escapeHtml(a.dob || "")}</td>
      <td>${escapeHtml(a.nhs || "")}</td>
      <td>${escapeHtml(a.email || "")}</td>
      <td>${escapeHtml(a.phone || "")}</td>
    </tr>
  `).join("");

  printArea.innerHTML = `
    <div class="print-wrap">
      <h2 style="margin:0 0 6px 0; font-size:18px;">${title}</h2>
      <div style="margin-bottom:10px; font-size:12px; color:#555;">
        Printed: ${escapeHtml(now)}
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Service</th>
            <th>Name</th>
            <th>DOB</th>
            <th>NHS</th>
            <th>Email</th>
            <th>Phone</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || `<tr><td colspan="8">No appointments</td></tr>`}
        </tbody>
      </table>
    </div>
  `;

  const w = window.open("", "_blank");
  if (!w) return alert("Popup blocked. Allow popups for printing.");

  w.document.open();
  w.document.write(`
    <html>
      <head>
        <title>Print Appointments</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .print-table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .print-table th, .print-table td { border: 1px solid #ddd; padding: 6px; text-align: left; vertical-align: top; }
          .print-table th { background: #f3f4f6; }
          @media print {
            body { padding: 0; }
            h2 { font-size: 16px; }
          }
        </style>
      </head>
      <body>
        ${printArea.innerHTML}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function(){ window.close(); };
          };
        </script>
      </body>
    </html>
  `);
  w.document.close();
}
