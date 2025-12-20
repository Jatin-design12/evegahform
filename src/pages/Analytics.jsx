import AdminSidebar from "../components/admin/AdminSidebar";
import useRiderAnalytics from "../hooks/useRiderAnalytics";

import DailyRiderChart from "../components/Charts/DailyRiderChart";
import EarningsChart from "../components/Charts/EarningsChart";
import ZonePieChart from "../components/Charts/ZonePieChart";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";

export default function Analytics() {
  const {
    totalRiders,
    activeRiders,
    suspendedRiders,
    totalRides,
    zoneStats,
  } = useRiderAnalytics();

  async function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("EVegah – Analytics Report", 14, 20);

    autoTable(doc, {
      startY: 30,
      head: [["Metric", "Value"]],
      body: [
        ["Total Riders", totalRiders],
        ["Active Riders", activeRiders],
        ["Suspended Riders", suspendedRiders],
        ["Total Rides", totalRides],
      ],
    });

    const chartIds = ["ridesChart", "zoneChart", "earningsChart"];
    let y = doc.lastAutoTable.finalY + 10;

    for (const id of chartIds) {
      const el = document.getElementById(id);
      if (!el) continue;
      const canvas = await html2canvas(el, { scale: 2 });
      const img = canvas.toDataURL("image/png");
      doc.addImage(img, "PNG", 15, y, 180, 80);
      y += 90;
    }

    doc.save("analytics-report.pdf");
  }

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <AdminSidebar />

      <main className="flex-1 p-6 space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Analytics</h1>

          <div className="flex gap-3">
            <select className="px-3 py-2 border rounded-md text-sm">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>This Month</option>
            </select>

            <button
              onClick={exportPDF}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Export PDF
            </button>
          </div>
        </div>

        {/* KPI STRIP */}
        <div className="grid grid-cols-4 gap-4">
          <Kpi title="Total Riders" value={totalRiders} />
          <Kpi title="Active Riders" value={activeRiders} green />
          <Kpi title="Suspended Riders" value={suspendedRiders} red />
          <Kpi title="Total Rides" value={totalRides} />
        </div>

        {/* MAIN CHARTS */}
        <div className="grid grid-cols-3 gap-6">
          {/* BIG CHART */}
          <div
            id="ridesChart"
            className="col-span-2 bg-white rounded-xl p-4 shadow"
          >
            <h3 className="font-semibold mb-3">Rides Per Day</h3>
            <DailyRiderChart />
          </div>

          {/* SIDE CHART */}
          <div
            id="zoneChart"
            className="bg-white rounded-xl p-4 shadow"
          >
            <ZonePieChart data={zoneStats} />
          </div>
        </div>

        {/* FULL WIDTH CHART */}
        <div
          id="earningsChart"
          className="bg-white rounded-xl p-4 shadow"
        >
          <h3 className="font-semibold mb-3">Earnings Analytics</h3>
          <EarningsChart />
        </div>
      </main>
    </div>
  );
}

/* KPI CARD */
function Kpi({ title, value, green, red }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <p className="text-gray-500 text-sm">{title}</p>
      <h2
        className={`text-2xl font-bold ${
          green ? "text-green-600" : red ? "text-red-600" : ""
        }`}
      >
        {value}
      </h2>
    </div>
  );
}
