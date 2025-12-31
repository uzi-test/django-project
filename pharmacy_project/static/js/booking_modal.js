/* =========================================================
   BOOKING MODAL (FULL)
   File: static/js/booking_modal.js
   v20251222-multi-booked
========================================================= */

console.log("BOOKING MODAL JS v20251222-multi-booked ✅ LOADED");

document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("openBookingModal");
  const modalEl = document.getElementById("bookingModal");

  if (!openBtn || !modalEl) return;

  if (!window.bootstrap || !window.bootstrap.Modal) {
    console.error("Bootstrap Modal not found. Make sure bootstrap.bundle.min.js is loaded.");
    return;
  }

  const bookingModal = new bootstrap.Modal(modalEl);

  // Steps
  const steps = [
    document.getElementById("step1"),
    document.getElementById("step2"),
    document.getElementById("step3"),
    document.getElementById("step4"),
    document.getElementById("step5"),
  ];

  // Footer Buttons
  const btnBack = document.getElementById("btnBack");
  const btnClose = document.getElementById("btnClose");
  const btnNext = document.getElementById("btnNext");
  const btnBook = document.getElementById("btnBook");
  const btnStartAgain = document.getElementById("btnStartAgain");

  // Chips
  const chipsWrap = document.getElementById("bookingChips");
  const chipService = document.querySelector("#chipService span");
  const chipDateTime = document.querySelector("#chipDateTime span");

  // Step 1
  const serviceSearch = document.getElementById("serviceSearch");
  const serviceList = document.getElementById("serviceList");

  // Step 2
  const calGrid = document.getElementById("calGrid");
  const calMonthLabel = document.getElementById("calMonthLabel");
  const calPrev = document.getElementById("calPrev");
  const calNext = document.getElementById("calNext");
  const timeGroups = document.getElementById("timeGroups");

  // Step 3
  const btnLoginChoice = document.getElementById("btnLoginChoice");
  const btnGuestChoice = document.getElementById("btnGuestChoice");

  // Step 4 form inputs
  const firstName = document.getElementById("firstName");
  const lastName = document.getElementById("lastName");
  const dob = document.getElementById("dob");
  const postcode = document.getElementById("postcode");
  const emailBooking = document.getElementById("emailBooking");
  const phone = document.getElementById("phone");
  const nhs = document.getElementById("nhs");
  const note = document.getElementById("note");
  const tosCheck = document.getElementById("tosCheck");

  // Step 5
  const confirmText = document.getElementById("confirmText");
  const confirmBig = document.getElementById("confirmBig");

  // ---------- State ----------
  let stepIndex = 0;
  let state = {
    services: [], // ✅ MULTI SELECT
    date: null,
    time: null,
    account: "guest",
  };

  // ✅ Booked times for currently selected date
  let BOOKED_TIMES = new Set();

  // ✅ UPDATED SERVICES LIST (Vaccines added)
  const SERVICES = Array.isArray(window.BOOKING_SERVICES) && window.BOOKING_SERVICES.length
    ? window.BOOKING_SERVICES
    : [
        // Vaccines
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

        // Other services
        "Blood Pressure Check",
        "Earwax Removal",
        "Pharmacy First Consultation",
        "Weight Loss Consultation",
        "Private Prescription",
      ];

  // ---------- Helpers ----------
  function cleanSpaces(s) {
    return (s || "").replace(/\s+/g, "").trim();
  }

  function isValidUKPhone(p) {
    const cleaned = cleanSpaces(p);
    return /^07\d{9}$/.test(cleaned) || /^\+447\d{9}$/.test(cleaned);
  }

  function isValidNHSNumber(n) {
    const cleaned = cleanSpaces(n);
    return /^\d{10}$/.test(cleaned);
  }

  function getCSRFToken() {
    const name = "csrftoken";
    const cookies = document.cookie.split(";").map(c => c.trim());
    for (const c of cookies) {
      if (c.startsWith(name + "=")) return decodeURIComponent(c.split("=")[1]);
    }
    return "";
  }

  function startOfToday() {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }

  function isPastDate(d) {
    return d.getTime() < startOfToday().getTime();
  }

  function sameDate(a, b) {
    return a && b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function formatChipDate(d) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${String(d.getDate()).padStart(2,"0")} ${months[d.getMonth()]}`;
  }

  function formatConfirmDate(d) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d.getDate()} ${months[d.getMonth()]}, ${d.getFullYear()}`;
  }

  function toAmPm(hhmm) {
    const [hh, mm] = String(hhmm).split(":").map(Number);
    const suffix = hh >= 12 ? "pm" : "am";
    const h = ((hh + 11) % 12) + 1;
    return `${h}:${String(mm).padStart(2,"0")}${suffix}`;
  }

  function servicesLine() {
    return state.services.length ? state.services.join(" + ") : "";
  }

  function toISODateOnly(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // ✅ Fetch booked slots from backend
  async function fetchBookedSlots(dateObj) {
    BOOKED_TIMES = new Set();
    if (!dateObj) return;

    const dateStr = toISODateOnly(dateObj);

    try {
      const res = await fetch(`/appointments/booked/?date=${encodeURIComponent(dateStr)}`);
      const data = await res.json();

      if (res.ok && data.status === "ok" && Array.isArray(data.times)) {
        // normalize times (keep HH:MM)
        data.times.forEach(t => {
          const hhmm = String(t).slice(0, 5);
          if (hhmm && hhmm.includes(":")) BOOKED_TIMES.add(hhmm);
        });
      }
    } catch (e) {
      console.warn("Booked slots fetch failed:", e);
    }
  }

  // ---------- UI ----------
  function showStep(i) {
    stepIndex = i;
    steps.forEach((s, idx) => {
      if (!s) return;
      s.style.display = (idx === i) ? "block" : "none";
    });

    if (btnBack) btnBack.style.visibility = i === 0 ? "hidden" : "visible";
    if (btnClose) btnClose.style.display = i === 4 ? "none" : "inline-flex";

    if (btnNext) btnNext.style.display = (i === 3 || i === 4) ? "none" : "inline-flex";
    if (btnBook) btnBook.style.display = i === 3 ? "inline-flex" : "none";
    if (btnStartAgain) btnStartAgain.style.display = i === 4 ? "inline-flex" : "none";

    if (chipsWrap) chipsWrap.style.display = i >= 1 ? "flex" : "none";

    if (chipService) chipService.textContent = servicesLine();

    if (chipDateTime) {
      chipDateTime.textContent = (state.date && state.time)
        ? `${formatChipDate(state.date)}, ${state.time}`
        : "";
    }
  }

  function resetAll() {
    state = { services: [], date: null, time: null, account: "guest" };
    BOOKED_TIMES = new Set();
    if (serviceSearch) serviceSearch.value = "";
    renderServices("");
    clearSelectionUI();
    showStep(0);
  }

  function clearSelectionUI() {
    if (serviceList) serviceList.querySelectorAll(".service-item").forEach(x => x.classList.remove("selected"));
    if (calGrid) calGrid.querySelectorAll(".cal-day").forEach(x => x.classList.remove("selected"));
    if (timeGroups) timeGroups.querySelectorAll(".slot").forEach(x => x.classList.remove("selected"));

    [firstName,lastName,dob,postcode,emailBooking,phone,nhs,note].forEach(inp => {
      if (inp) inp.value = "";
    });
    if (tosCheck) tosCheck.checked = false;
  }

  // ---------- Step 1: Services (MULTI SELECT) ----------
  function renderServices(filter) {
    if (!serviceList) return;
    serviceList.innerHTML = "";

    const f = (filter || "").toLowerCase();

    SERVICES
      .filter(name => name.toLowerCase().includes(f))
      .forEach(name => {
        const item = document.createElement("div");
        item.className = "service-item";

        if (state.services.includes(name)) item.classList.add("selected");

        item.innerHTML = `
          <span class="tick"></span>
          <span class="service-name">${name}</span>
        `;

        item.addEventListener("click", () => {
          item.classList.toggle("selected");

          if (item.classList.contains("selected")) {
            if (!state.services.includes(name)) state.services.push(name);
          } else {
            state.services = state.services.filter(x => x !== name);
          }

          showStep(stepIndex);
        });

        serviceList.appendChild(item);
      });
  }

  // ---------- Step 2: Calendar ----------
  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth();

  function buildCalendar(year, month) {
    if (!calGrid || !calMonthLabel) return;
    calGrid.innerHTML = "";

    const monthNames = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];
    calMonthLabel.textContent = `${monthNames[month]} ${year}`;

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const daysInMonth = last.getDate();

    let startIndex = first.getDay();
    startIndex = (startIndex === 0) ? 6 : startIndex - 1;

    for (let i = 0; i < startIndex; i++) {
      const blank = document.createElement("div");
      blank.className = "cal-day blank";
      calGrid.appendChild(blank);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      dateObj.setHours(0, 0, 0, 0);

      const cell = document.createElement("div");
      cell.className = "cal-day";
      cell.textContent = day;

      if (isPastDate(dateObj)) {
        cell.classList.add("disabled");
        cell.title = "Past date (disabled)";
      } else {
        cell.addEventListener("click", async () => {
          calGrid.querySelectorAll(".cal-day").forEach(x => x.classList.remove("selected"));
          cell.classList.add("selected");

          state.date = dateObj;
          state.time = null;

          // ✅ fetch booked times for selected date then render slots
          await fetchBookedSlots(state.date);
          renderTimeSlots();

          showStep(1);
        });
      }

      if (state.date && sameDate(state.date, dateObj)) cell.classList.add("selected");
      calGrid.appendChild(cell);
    }
  }

  function makeSlots(startHHMM, count, stepMin) {
    const [hh, mm] = startHHMM.split(":").map(Number);
    const out = [];
    let total = hh * 60 + mm;
    for (let i = 0; i < count; i++) {
      const h = Math.floor(total / 60);
      const m = total % 60;
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      total += stepMin;
    }
    return out;
  }

  function renderTimeSlots() {
    if (!timeGroups) return;
    timeGroups.innerHTML = "";

    const dateOk = state.date && !isPastDate(state.date);

    const groups = [
      { hour: "09:00", slots: makeSlots("09:00", 12, 5) },
      { hour: "10:00", slots: makeSlots("10:00", 12, 5) },
      { hour: "11:00", slots: makeSlots("11:00", 12, 5) },
    ];

    groups.forEach(g => {
      const group = document.createElement("div");
      group.className = "time-group";
      group.innerHTML = `
        <div class="time-group-head">
          <i class="bi bi-clock"></i>
          <strong>${g.hour}</strong>
          <span class="muted">(${g.slots.length} slots)</span>
        </div>
        <div class="slots"></div>
      `;

      const slotsWrap = group.querySelector(".slots");

      g.slots.forEach(t => {
        const hhmm = String(t).slice(0, 5);
        const isBooked = BOOKED_TIMES.has(hhmm);

        const b = document.createElement("button");
        b.type = "button";
        b.className = "slot";
        b.textContent = hhmm;

        if (!dateOk || isBooked) {
          b.disabled = true;
          b.classList.add("disabled");
          if (isBooked) {
            b.classList.add("booked");
            b.title = "Already booked";
          }
        } else {
          b.addEventListener("click", () => {
            timeGroups.querySelectorAll(".slot").forEach(x => x.classList.remove("selected"));
            b.classList.add("selected");
            state.time = hhmm;
            showStep(1);
          });
        }

        slotsWrap.appendChild(b);
      });

      timeGroups.appendChild(group);
    });
  }

  function canGoNext() {
    if (stepIndex === 0) return state.services.length > 0;
    if (stepIndex === 1) return !!state.date && !!state.time && !isPastDate(state.date);
    if (stepIndex === 2) return true;
    return true;
  }

  function validateBookingForm() {
    const required = [
      { el: firstName, name: "First name" },
      { el: lastName, name: "Last name" },
      { el: dob, name: "Date of birth" },
      { el: postcode, name: "Postcode" },
      { el: emailBooking, name: "Email" },
      { el: phone, name: "Phone Number" },
      { el: nhs, name: "NHS Number" },
    ];

    for (const r of required) {
      if (!r.el || !r.el.value.trim()) {
        Swal.fire("Missing Field", `${r.name} is required.`, "warning");
        if (r.el) r.el.focus();
        return false;
      }
    }

    if (!isValidUKPhone(phone.value)) {
      Swal.fire("Invalid Phone Number", "UK mobile format: 07400 123456 or +447400123456", "error");
      phone.focus();
      return false;
    }

    if (!isValidNHSNumber(nhs.value)) {
      Swal.fire("Invalid NHS Number", "NHS number must be 10 digits (spaces allowed).", "error");
      nhs.focus();
      return false;
    }

    if (!tosCheck || !tosCheck.checked) {
      Swal.fire("Terms Required", "Please accept Terms of Service and Privacy Policy.", "warning");
      return false;
    }

    return true;
  }

  // ---------- Events ----------
  openBtn.addEventListener("click", () => {
    resetAll();

    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();

    buildCalendar(currentYear, currentMonth);
    renderTimeSlots(); // disabled until date selected

    bookingModal.show();
  });

  if (btnClose) btnClose.addEventListener("click", () => bookingModal.hide());
  if (btnBack) btnBack.addEventListener("click", () => { if (stepIndex > 0) showStep(stepIndex - 1); });

  if (btnNext) {
    btnNext.addEventListener("click", () => {
      if (!canGoNext()) {
        Swal.fire("Select Required", "Please complete this step first.", "info");
        return;
      }
      showStep(stepIndex + 1);
    });
  }

  if (btnBook) {
    btnBook.addEventListener("click", async () => {
      if (!validateBookingForm()) return;

      const payload = {
        service: servicesLine(), // join multiple services
        date: toISODateOnly(state.date),
        time: state.time,
        first_name: firstName.value.trim(),
        last_name: lastName.value.trim(),
        dob: dob.value.trim(),
        postcode: postcode.value.trim(),
        email: emailBooking.value.trim(),
        phone: cleanSpaces(phone.value),
        nhs_number: cleanSpaces(nhs.value),
        note: (note && note.value) ? note.value.trim() : "",
      };

      try {
        const res = await fetch("/appointments/create/", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRFToken() },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok || data.status !== "ok") {
          // ✅ if backend says slot already booked
          Swal.fire("Error", data.message || "Could not save appointment.", "error");
          // refresh booked slots + re-render so it becomes disabled instantly
          if (state.date) {
            await fetchBookedSlots(state.date);
            renderTimeSlots();
          }
          return;
        }

        // ✅ success -> mark as booked in UI instantly
        BOOKED_TIMES.add(String(state.time).slice(0,5));
        renderTimeSlots();

        const fullName = `${payload.first_name} ${payload.last_name}`.trim();
        const dtLine = `${formatConfirmDate(state.date)} @ ${toAmPm(state.time)}`;

        if (confirmText) confirmText.textContent = `Your '${servicesLine()}' appointment has been confirmed for ${fullName}`;
        if (confirmBig) confirmBig.textContent = dtLine;

        showStep(4);

      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Network error. Please try again.", "error");
      }
    });
  }

  if (btnStartAgain) btnStartAgain.addEventListener("click", () => resetAll());

  if (btnLoginChoice) {
    btnLoginChoice.addEventListener("click", () => {
      state.account = "login";
      const loginModalEl = document.getElementById("loginModal");
      if (loginModalEl) {
        bookingModal.hide();
        const loginModal = new bootstrap.Modal(loginModalEl);
        loginModal.show();
      } else {
        Swal.fire("Login", "Login modal not found.", "info");
      }
    });
  }

  if (btnGuestChoice) btnGuestChoice.addEventListener("click", () => { state.account = "guest"; showStep(3); });

  if (serviceSearch) serviceSearch.addEventListener("input", (e) => renderServices(e.target.value));

  if (calPrev) {
    calPrev.addEventListener("click", () => {
      currentMonth -= 1;
      if (currentMonth < 0) { currentMonth = 11; currentYear -= 1; }
      buildCalendar(currentYear, currentMonth);
    });
  }

  if (calNext) {
    calNext.addEventListener("click", () => {
      currentMonth += 1;
      if (currentMonth > 11) { currentMonth = 0; currentYear += 1; }
      buildCalendar(currentYear, currentMonth);
    });
  }

  renderServices("");
});
