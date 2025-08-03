function parseDate(str) {
  const [d, m, y, time] = str.match(/\d+/g) || [];
  if (!d || !m || !y || !time) return null;
  return new Date(`${y}-${m}-${d}T${time.length === 4 ? time : time.slice(0, 2) + ':' + time.slice(2)}`);
}

function generateReport() {
  const fileInput = document.getElementById("csvFile");
  const dateInput = document.getElementById("dateInput").value;

  if (!fileInput.files.length || !dateInput) {
    alert("Upload CSV and choose date");
    return;
  }

  Papa.parse(fileInput.files[0], {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      const stores = [
        "BLR_kalyan-nagar", "BLR_koramangala", "CH_Periyamet",
        "DEL_malviya-nagar", "HYD_manikonda", "KOL-Topsia",
        "MUM_andheri", "PUN_koregaon-park"
      ];

      const rows = results.data.filter(row => {
        const orderDate = parseDate(row["Order Date"]);
        const endTime = parseDate(row["End Time (Actual)"]);
        const darkStore = row["Order Dark Store"];
        const status = row["Order Status"]?.toLowerCase();
        const endDateMatch = endTime && endTime.toISOString().slice(0, 10) === dateInput;

        return orderDate && endTime && stores.includes(darkStore) &&
               status === "delivered" && endDateMatch;
      });

      const summary = {};
      let totalMet = 0, totalBreach = 0;

      rows.forEach(row => {
        const darkStore = row["Order Dark Store"];
        const orderDate = parseDate(row["Order Date"]);
        const endTime = parseDate(row["End Time (Actual)"]);

        const deliveryType = orderDate.getHours() < 15 ? "Quick" : "Non Quick";
        const tat = new Date(orderDate);
        tat.setDate(tat.getDate() + (orderDate.getHours() < 15 ? 0 : 1));
        tat.setHours(23, 59, 59);

        const slaStatus = endTime > tat ? "SLA Breach" : "SLA Met";

        summary[darkStore] = summary[darkStore] || { met: 0, breach: 0 };
        if (slaStatus === "SLA Met") summary[darkStore].met++;
        else summary[darkStore].breach++;

        if (slaStatus === "SLA Met") totalMet++;
        else totalBreach++;
      });

      summary["Grand Total"] = { met: totalMet, breach: totalBreach };
      displayTable(summary);
      displayChart(summary);
    }
  });
}

function displayTable(summary) {
  const tableDiv = document.getElementById("reportTable");
  let html = `
    <table><thead>
    <tr><th>Order Dark Store</th><th>SLA MET</th><th>SLA BREACH</th>
    <th>Total Delivered</th><th>SLA MET%</th><th>SLA BREACH%</th></tr></thead><tbody>
  `;

  for (const store in summary) {
    const { met, breach } = summary[store];
    const total = met + breach;
    const metPercent = total ? Math.round((met / total) * 100) : 0;
    const breachPercent = 100 - metPercent;
    html += `<tr><td>${store}</td><td>${met}</td><td>${breach}</td><td>${total}</td>
      <td>${metPercent}%</td><td>${breachPercent}%</td></tr>`;
  }

  html += "</tbody></table>";
  tableDiv.innerHTML = html;
}

function displayChart(summary) {
  const ctx = document.getElementById("slaChart").getContext("2d");

  if (window.slaChartInstance) {
    window.slaChartInstance.destroy();
  }

  const labels = Object.keys(summary);
  const metPercents = labels.map(k => {
    const total = summary[k].met + summary[k].breach;
    return total ? Math.round((summary[k].met / total) * 100) : 0;
  });
  const breachPercents = metPercents.map(p => 100 - p);

  window.slaChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'SLA MET%',
          data: metPercents,
          backgroundColor: '#90ee90'
        },
        {
          label: 'SLA BREACH%',
          data: breachPercents,
          backgroundColor: '#ff4500'
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        title: {
          display: true,
          text: 'SLA MET% vs SLA BREACH%'
        }
      },
      scales: {
        y: { beginAtZero: true, max: 100 }
      }
    }
  });
}
