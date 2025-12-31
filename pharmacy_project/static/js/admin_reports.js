console.log("ADMIN REPORTS JS LOADED ✅");

let bookedChart = null;
let openChart = null;
let donutChart = null;

function buildLineChart(ctx, labels, data, titleText) {
  return new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: titleText,
        data,
        tension: 0.3,
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
}

function buildDonutChart(ctx, bookedTotal, openTotal) {
  return new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Booked", "Open"],
      datasets: [{
        data: [bookedTotal, openTotal],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      cutout: "65%",
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (context) => {
              const val = context.parsed || 0;
              const total = (bookedTotal + openTotal) || 1;
              const pct = ((val / total) * 100).toFixed(1);
              return `${context.label}: ${val} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

async function loadReports(days = 30) {
  const res = await fetch(`/admin-dashboard/reports/data/?days=${days}`);
  const data = await res.json();

  if (data.status !== "ok") return;

  const labels = data.labels || [];
  const booked = data.booked || [];
  const open = data.open || [];

  const meta1 = document.getElementById("rpMeta1");
  const meta2 = document.getElementById("rpMeta2");
  const meta3 = document.getElementById("rpMeta3");

  const totalBooked = booked.reduce((a, b) => a + (Number(b) || 0), 0);
  const totalOpen = open.reduce((a, b) => a + (Number(b) || 0), 0);

  const avgBooked = booked.length ? (totalBooked / booked.length).toFixed(1) : "0";
  const slotsPerDay = data.total_slots_per_day ?? "—";

  if (meta1) meta1.textContent = `Total: ${totalBooked} • Avg/day: ${avgBooked}`;
  if (meta2) meta2.textContent = `Slots/day: ${slotsPerDay} • Last ${days} days`;
  if (meta3) meta3.textContent = `Booked: ${totalBooked} • Open: ${totalOpen}`;

  // destroy old charts
  if (bookedChart) bookedChart.destroy();
  if (openChart) openChart.destroy();
  if (donutChart) donutChart.destroy();

  // LINE charts
  const bookedCanvas = document.getElementById("bookedChart");
  const openCanvas = document.getElementById("openChart");

  if (bookedCanvas) {
    bookedChart = buildLineChart(bookedCanvas, labels, booked, "Booked");
  }

  if (openCanvas) {
    openChart = buildLineChart(openCanvas, labels, open, "Open Slots");
  }

  // DONUT chart
  const donutCanvas = document.getElementById("donutChart");
  if (donutCanvas) {
    donutChart = buildDonutChart(donutCanvas, totalBooked, totalOpen);
  } else {
    console.warn("donutChart canvas not found (id='donutChart').");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const sel = document.getElementById("rpDays");
  loadReports(sel ? Number(sel.value) : 30);

  if (sel) {
    sel.addEventListener("change", () => {
      loadReports(Number(sel.value));
    });
  }
});
