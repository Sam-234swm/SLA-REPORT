function processFile() {
  const file = document.getElementById("csvFile").files[0];
  const selectedDate = document.getElementById("filterDate").value;
  if (!file || !selectedDate) return alert("Please upload CSV and select date");

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const rows = text.trim().split("\n").map(r => r.split(","));
    const headers = rows[0];
    const data = rows.slice(1).map(r => Object.fromEntries(r.map((v, i) => [headers[i], cleanCell(v)])));

    const report = generateReport(data, selectedDate);
    renderTable(report.summary);
    renderChart(report.summary);
  };
  reader.readAsText(file);
}

function cleanCell(val) {
  return val.replace(/^="|^=\("?|"?\)?$/g, "").trim();
}

function generateReport(data, dateStr) {
  const targetDate = new Date(dateStr);
  const filtered = data.filter(d => d["Order Status"].toLowerCase() === "delivered" && sameDate(new Date(d["End Time (Actual)"]), targetDate));

  const stores = {};
  filtered.forEach(row => {
    const store = row["Order Dark Store"];
    const orderDate = new Date(row["Order Date"]);
    const endDate = new Date(row["End Time (Actual)"]);
    const tat = getTat(orderDate);
    const met = endDate <= tat ? "SLA MET" : "SLA BREACH";

    if (!stores[store]) stores[store] = { met: 0, breach: 0 };
    if (met === "SLA MET") stores[store].met++;
    else stores[store].breach++;
  });

  const summary = [];
  let totalMet = 0, totalBreach = 0;

  for (const [store, val] of Object.entries(stores)) {
    const total = val.met + val.breach;
    totalMet += val.met;
    totalBreach += val.breach;
    summary.push({
      store,
      met: val.met,
      breach: val.breach,
      total,
      metPercent: Math.round((val.met / total) * 100),
      breachPercent: Math.round((val.breach / total) * 100)
    });
  }

  const grandTotal = {
    store: "Grand Total",
    met: totalMet,
    breach: totalBreach,
    total: totalMet + totalBreach,
    metPercent: Math.round((totalMet / (totalMet + totalBreach)) * 100),
    breachPercent: 100 - Math.round((totalMet / (totalMet + totalBreach)) * 100)
  };

  summary.push(grandTotal);
  return { summary };
}

function sameDate(a, b) {
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

function getTat(orderDate) {
  const hour = orderDate.getHours();
  const tat = new Date(orderDate);
  tat.setHours(23, 59, 59);
  if (hour >= 15) tat.setDate(tat.getDate() + 1);
  return tat;
}

function renderTable(data) {
  let html = `<table><thead><tr>
    <th>Order Dark Store</th><th>SLA MET</th><th>SLA BREACH</th>
    <th>Total Delivered</th><th>SLA MET%</th><th>SLA BREACH%</th></tr></thead><tbody>`;

  data.forEach(row => {
    html += `<tr>
      <td>${row.store}</td><td>${row.met}</td><td>${row.breach}</td>
      <td>${row.total}</td><td>${row.metPercent}%</td><td>${row.breachPercent}%</td>
    </tr>`;
  });

  html += "</tbody></table>";
  document.getElementById("reportTable").innerHTML = html;
}

function renderChart(data) {
  const ctx = document.getElementById('slaChart').getContext('2d');
  const labels = data.map(d => d.store);
  const met = data.map(d => d.metPercent);
  const breach = data.map(d => d.breachPercent);

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: "SLA MET%", data: met, backgroundColor: "lightgreen" },
        { label: "SLA BREACH%", data: breach, backgroundColor: "orangered" }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: "SLA MET% vs SLA BREACH%" },
        legend: { position: "top" }
      },
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true, max: 100 }
      }
    }
  });
}
