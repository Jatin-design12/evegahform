import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BadgeIndianRupee,
  BatteryCharging,
  ClipboardList,
  FileText,
  MapPinned,
  Repeat,
  User,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import EmployeeLayout from "../../components/layouts/EmployeeLayout";
import useAuth from "../../hooks/useAuth";
import useVehicleZoneCounts from "../../hooks/useVehicleZoneCounts";
import { deleteRiderDraft, listRiderDrafts } from "../../utils/riderDrafts";
import { listBatterySwaps } from "../../utils/batterySwaps";
import { getPaymentDueSummary, listPaymentDues } from "../../utils/paymentDues";

const formatINR = (value) => {
  const n = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${Math.round(n)}`;
  }
};

function StatCardWithIcon({ label, value, icon: Icon }) {
  return (
    <div className="card p-4 transition-colors hover:bg-gray-50">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          {label}
        </p>
        {Icon ? (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-evegah-bg border border-evegah-border">
            <Icon className="h-5 w-5 text-evegah-text" />
          </span>
        ) : null}
      </div>
      <p className="text-xl font-semibold mt-2 text-evegah-text">{value}</p>
    </div>
  );
}

const toDayKey = (value) => {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
  } catch {
    return "";
  }
};

const buildDailySeries = ({ rows, dateField, valueFn, days = 14 }) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - (days - 1));

  const buckets = new Map();
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    buckets.set(d.toISOString(), 0);
  }

  (rows || []).forEach((r) => {
    const key = toDayKey(r?.[dateField]);
    if (!key || !buckets.has(key)) return;
    const v = Number(valueFn(r) || 0);
    buckets.set(key, (buckets.get(key) || 0) + v);
  });

  const fmt = new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "2-digit",
  });

  return Array.from(buckets.entries()).map(([k, v]) => ({
    day: fmt.format(new Date(k)),
    value: v,
  }));
};

function DashboardChartCard({ icon: Icon, title, subtitle, children, action }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {Icon ? (
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-evegah-bg border border-evegah-border">
                <Icon className="h-5 w-5 text-evegah-text" />
              </span>
            ) : null}
            <h2 className="font-medium">{title}</h2>
          </div>
          {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
        </div>
        {action || null}
      </div>
      <div className="mt-4 h-56">{children}</div>
    </div>
  );
}

function ZoneRadialCard({ counts, loading }) {
  const zones = [
    {
      key: "Gotri",
      label: "Gotri",
      color: "text-evegah-primary",
      dot: "bg-evegah-primary",
    },
    {
      key: "Manjalpur",
      label: "Manjalpur",
      color: "text-brand-medium",
      dot: "bg-brand-medium",
    },
    {
      key: "Karelibaug",
      label: "Karelibaug",
      color: "text-brand-soft",
      dot: "bg-brand-soft",
    },
    {
      key: "Daman",
      label: "Daman",
      color: "text-evegah-accent",
      dot: "bg-evegah-accent",
    },
  ];

  const safeCounts = counts || {};
  const total = zones.reduce((sum, z) => sum + Number(safeCounts[z.key] || 0), 0);

  // Concentric ring settings (SVG coordinate system)
  const cx = 90;
  const cy = 90;
  const radii = [70, 58, 46, 34];
  const strokeWidth = 10;

  const percentFor = (value) => {
    const v = Number(value || 0);
    if (!total) return 0;
    return Math.max(0, Math.min(1, v / total));
  };

  return (
    <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-center">
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width="180" height="180" viewBox="0 0 180 180">
            {zones.map((z, idx) => {
              const r = radii[idx];
              const c = 2 * Math.PI * r;
              const pct = percentFor(safeCounts[z.key]);
              const dashOffset = c * (1 - pct);
              return (
                <g key={z.key}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    className="text-gray-200"
                    strokeWidth={strokeWidth}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill="none"
                    stroke="currentColor"
                    className={z.color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={dashOffset}
                    transform={`rotate(-90 ${cx} ${cy})`}
                  />
                </g>
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-2xl font-semibold text-evegah-text">
              {loading ? "…" : total}
            </p>
            <p className="text-xs font-medium text-gray-500">Active Vehicles</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        {zones.map((z) => (
          <div key={z.key} className="flex items-start gap-3">
            <span className={`mt-2 h-2.5 w-2.5 rounded-full ${z.dot}`} />
            <div>
              <p className="text-xl font-semibold text-evegah-text">
                {loading ? "…" : Number(safeCounts[z.key] || 0)}
              </p>
              <p className="text-xs text-gray-500">{z.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { counts: zoneCounts, loading: zoneCountsLoading } =
    useVehicleZoneCounts();

  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);

  const [swaps, setSwaps] = useState([]);
  const [swapsLoading, setSwapsLoading] = useState(false);

  const [dues, setDues] = useState([]);
  const [duesLoading, setDuesLoading] = useState(false);
  const [dueSummary, setDueSummary] = useState({ due_count: 0, due_total: 0 });
  const [banner, setBanner] = useState(null);

  const bannerStyles = {
    info: "bg-blue-50 border-blue-200 text-blue-700",
    error: "bg-red-50 border-red-200 text-red-700",
  };

  useEffect(() => {
    const loadDashboard = async () => {
      if (loading) return;
      if (!user?.uid) return;

      try {
        setBanner(null);
        setDraftsLoading(true);
        setSwapsLoading(true);
        setDuesLoading(true);

        const [draftRows, swapRows, dueRows, dueSummaryRow] = await Promise.all([
          listRiderDrafts(user.uid),
          listBatterySwaps(user.uid),
          listPaymentDues(user.uid),
          getPaymentDueSummary(user.uid),
        ]);

        setDrafts(draftRows || []);
        setSwaps(swapRows || []);
        setDues(dueRows || []);
        setDueSummary(dueSummaryRow || { due_count: 0, due_total: 0 });
      } catch (e) {
        setDrafts([]);
        setSwaps([]);
        setDues([]);
        setDueSummary({ due_count: 0, due_total: 0 });
        setBanner({
          type: "error",
          message: e?.message || "Unable to load dashboard data.",
        });
      } finally {
        setDraftsLoading(false);
        setSwapsLoading(false);
        setDuesLoading(false);
      }
    };

    loadDashboard();
  }, [location.pathname, user?.uid, loading]);

  const handleContinueDraft = (draft) => {
    const stepPath = draft?.step_path || draft?.meta?.stepPath || "step-1";
    navigate(`/employee/new-rider/draft/${draft.id}/${stepPath}`);
  };

  const handleDeleteDraft = async (draftId) => {
    try {
      await deleteRiderDraft(draftId);
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
    } catch {
      // ignore
    }
  };

  const swapSeries = buildDailySeries({
    rows: swaps,
    dateField: "swapped_at",
    valueFn: () => 1,
    days: 14,
  });

  const dueSeries = buildDailySeries({
    rows: (dues || []).filter((d) => d?.status === "due"),
    dateField: "due_date",
    valueFn: (d) => Number(d?.amount_due || 0),
    days: 14,
  });

  return (
    <EmployeeLayout>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Employee
          </p>
          <h1 className="text-2xl font-semibold text-evegah-text">Dashboard</h1>
          <p className="text-sm text-gray-500">
            Drafts, battery swaps, and quick actions.
          </p>
        </div>
      </div>

      {banner && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm mb-6 ${
            bannerStyles[banner.type] || bannerStyles.info
          }`}
        >
          {banner.message}
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCardWithIcon
          label="Drafts"
          value={draftsLoading ? "…" : drafts.length}
          icon={FileText}
        />
        <StatCardWithIcon
          label="Battery Swaps"
          value={swapsLoading ? "…" : swaps.length}
          icon={BatteryCharging}
        />
        <StatCardWithIcon
          label="Payment Due"
          value={
            duesLoading
              ? "…"
              : `${formatINR(dueSummary?.due_total)} (${dueSummary?.due_count || 0})`
          }
          icon={BadgeIndianRupee}
        />
        <StatCardWithIcon
          label="Signed In"
          value={user?.email || "-"}
          icon={User}
        />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <DashboardChartCard
          icon={BatteryCharging}
          title="Battery Swaps"
          subtitle="Swaps recorded in the last 14 days"
          action={
            <button
              type="button"
              className="btn-outline"
              onClick={() => navigate("/employee/battery-swap")}
            >
              View All →
            </button>
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={swapSeries} margin={{ top: 6, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="currentColor" className="text-evegah-border" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "currentColor", fontSize: 12 }}
                className="text-gray-500"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "currentColor", fontSize: 12 }}
                className="text-gray-500"
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={36}
              />
              <Tooltip
                cursor={{ stroke: "currentColor" }}
                contentStyle={{
                  borderRadius: 12,
                  borderColor: "#E5E7EB",
                }}
                formatter={(v) => [v, "Swaps"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="currentColor"
                fill="currentColor"
                fillOpacity={0.15}
                strokeWidth={2.5}
                className="text-evegah-primary"
              />
            </AreaChart>
          </ResponsiveContainer>
        </DashboardChartCard>

        <DashboardChartCard
          icon={BadgeIndianRupee}
          title="Payment Due"
          subtitle="Total due amount by due date (last 14 days)"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dueSeries} margin={{ top: 6, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="currentColor" className="text-evegah-border" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "currentColor", fontSize: 12 }}
                className="text-gray-500"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "currentColor", fontSize: 12 }}
                className="text-gray-500"
                axisLine={false}
                tickLine={false}
                width={46}
                tickFormatter={(v) => {
                  const n = Number(v || 0);
                  if (n >= 100000) return `${Math.round(n / 1000)}k`;
                  if (n >= 1000) return `${Math.round(n / 1000)}k`;
                  return `${Math.round(n)}`;
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  borderColor: "#E5E7EB",
                }}
                formatter={(v) => [formatINR(v), "Due Amount"]}
              />
              <Bar
                dataKey="value"
                fill="currentColor"
                className="text-evegah-accent"
                radius={[10, 10, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </DashboardChartCard>

        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-evegah-bg border border-evegah-border">
                  <MapPinned className="h-5 w-5 text-evegah-text" />
                </span>
                <h2 className="font-medium">Vehicles by Zone</h2>
              </div>
              <p className="text-sm text-gray-500">
                Active vehicles by zone (auto-updates on return).
              </p>
            </div>
          </div>
          <ZoneRadialCard counts={zoneCounts} loading={zoneCountsLoading} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
      {/* PAYMENT DUES TABLE */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-evegah-bg border border-evegah-border">
                <ClipboardList className="h-5 w-5 text-evegah-text" />
              </span>
              <h2 className="font-medium">Rider Payment Due</h2>
            </div>
            <p className="text-sm text-gray-500">
              Riders with pending dues.
            </p>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-evegah-border">
                <th className="py-2 pr-3 font-medium">Rider</th>
                <th className="py-2 pr-3 font-medium">Phone</th>
                <th className="py-2 pr-3 font-medium">Amount Due</th>
                <th className="py-2 pr-3 font-medium">Due Date</th>
                <th className="py-2 pr-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {duesLoading ? (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={5}>
                    Loading dues...
                  </td>
                </tr>
              ) : dues.filter((d) => d.status === "due").length === 0 ? (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={5}>
                    No payment dues.
                  </td>
                </tr>
              ) : (
                dues
                  .filter((d) => d.status === "due")
                  .slice(0, 8)
                  .map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-evegah-border last:border-b-0 hover:bg-gray-50"
                    >
                      <td className="py-3 pr-3">{d.rider_name || "-"}</td>
                      <td className="py-3 pr-3">{d.rider_phone || "-"}</td>
                      <td className="py-3 pr-3">{formatINR(d.amount_due)}</td>
                      <td className="py-3 pr-3 text-gray-500">
                        {d.due_date
                          ? new Date(d.due_date).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-3 pr-3">{d.status}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECENT BATTERY SWAPS TABLE */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-evegah-bg border border-evegah-border">
                <Repeat className="h-5 w-5 text-evegah-text" />
              </span>
              <h2 className="font-medium">Recent Battery Swaps</h2>
            </div>
            <p className="text-sm text-gray-500">
              Latest swaps recorded by you.
            </p>
          </div>

          <button
            type="button"
            className="btn-outline"
            onClick={() => navigate("/employee/battery-swap")}
          >
            View All →
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-evegah-border">
                <th className="py-2 pr-3 font-medium">Rider</th>
                <th className="py-2 pr-3 font-medium">Mobile</th>
                <th className="py-2 pr-3 font-medium">Vehicle</th>
                <th className="py-2 pr-3 font-medium">Battery OUT</th>
                <th className="py-2 pr-3 font-medium">Battery IN</th>
                <th className="py-2 pr-3 font-medium">Swapped At</th>
              </tr>
            </thead>
            <tbody>
              {swapsLoading ? (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={6}>
                    Loading swaps...
                  </td>
                </tr>
              ) : swaps.length === 0 ? (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={6}>
                    No swaps yet.
                  </td>
                </tr>
              ) : (
                swaps.slice(0, 5).map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-evegah-border last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="py-3 pr-3">{s.rider_full_name || "-"}</td>
                    <td className="py-3 pr-3">{s.rider_mobile || "-"}</td>
                    <td className="py-3 pr-3">{s.vehicle_number}</td>
                    <td className="py-3 pr-3">{s.battery_out}</td>
                    <td className="py-3 pr-3">{s.battery_in}</td>
                    <td className="py-3 pr-3 text-gray-500">
                      {s.swapped_at
                        ? new Date(s.swapped_at).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* DRAFTS */}
      <div className="card mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-evegah-bg border border-evegah-border">
                <FileText className="h-5 w-5 text-evegah-text" />
              </span>
              <h2 className="font-medium">Drafts</h2>
            </div>
            <p className="text-sm text-gray-500">
              Saved rider forms you can continue later.
            </p>
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/employee/new-rider/step-1")}
          >
            New Rider →
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-evegah-border">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Phone</th>
                <th className="py-2 pr-3 font-medium">Step</th>
                <th className="py-2 pr-3 font-medium">Updated</th>
                <th className="py-2 pr-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {draftsLoading ? (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={5}>
                    Loading drafts...
                  </td>
                </tr>
              ) : drafts.length === 0 ? (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={5}>
                    No drafts yet.
                  </td>
                </tr>
              ) : (
                drafts.map((draft) => (
                  <tr
                    key={draft.id}
                    className="border-b border-evegah-border last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="py-3 pr-3">{draft.name || "Unnamed"}</td>
                    <td className="py-3 pr-3">{draft.phone || "-"}</td>
                    <td className="py-3 pr-3">{draft.step_label || "-"}</td>
                    <td className="py-3 pr-3 text-gray-500">
                      {draft.updated_at
                        ? new Date(draft.updated_at).toLocaleString()
                        : "-"}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => handleContinueDraft(draft)}
                        >
                          Continue
                        </button>
                        <button
                          type="button"
                          className="btn-muted"
                          onClick={() => handleDeleteDraft(draft.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </EmployeeLayout>
  );
}
