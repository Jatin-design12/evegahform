import { useEffect, useMemo, useState } from "react";

import EmployeeLayout from "../../../components/layouts/EmployeeLayout";
import useAuth from "../../../hooks/useAuth";
import {
  createBatterySwap,
  getBatteryUsage,
  listBatterySwaps,
} from "../../../utils/batterySwaps";
import { BATTERY_ID_OPTIONS } from "../../../utils/batteryIds";

const normalizeId = (value) => String(value || "").trim().toUpperCase();

const bannerStyles = {
  success: "bg-green-50 border-green-200 text-green-700",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
  info: "bg-blue-50 border-blue-200 text-blue-700",
  error: "bg-red-50 border-red-200 text-red-700",
};

function KpiCard({ label, value, helper, period, onPeriodChange, showPeriod }) {
  return (
    <div className="rounded-2xl border border-evegah-border bg-white shadow-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-evegah-text">{label}</p>

        {showPeriod ? (
          <select
            className="rounded-lg border border-evegah-border bg-white px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-evegah-primary"
            value={period}
            onChange={(e) => onPeriodChange(e.target.value)}
          >
            <option value="day">Day</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        ) : null}
      </div>

      <p className="mt-3 text-4xl font-semibold text-evegah-text leading-none">{value}</p>
      {helper ? <p className="mt-1 text-xs text-gray-500">{helper}</p> : null}
    </div>
  );
}

export default function BatterySwaps() {
  const { user, loading } = useAuth();

  const [kpiPeriod, setKpiPeriod] = useState("day");

  const [rows, setRows] = useState([]);
  const [rowsLoading, setRowsLoading] = useState(false);

  const [usageRows, setUsageRows] = useState([]);
  const [usageLoading, setUsageLoading] = useState(false);

  const [form, setForm] = useState({
    vehicleNumber: "",
    batteryOut: "",
    batteryIn: "",
    notes: "",
  });

  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);

  const canLoad = useMemo(() => !loading && Boolean(user?.uid), [loading, user?.uid]);

  const kpis = useMemo(() => {
    const all = Array.isArray(rows) ? rows : [];
    const now = new Date();

    const start = (() => {
      if (kpiPeriod === "day") {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      }
      if (kpiPeriod === "week") {
        return now.getTime() - 7 * 24 * 60 * 60 * 1000;
      }
      if (kpiPeriod === "month") {
        return now.getTime() - 30 * 24 * 60 * 60 * 1000;
      }
      if (kpiPeriod === "year") {
        return now.getTime() - 365 * 24 * 60 * 60 * 1000;
      }
      return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    })();

    const end = kpiPeriod === "day"
      ? start + 24 * 60 * 60 * 1000
      : now.getTime() + 1;

    const periodRows = all.filter((r) => {
      const t = r?.swapped_at ? new Date(r.swapped_at).getTime() : NaN;
      return Number.isFinite(t) && t >= start && t < end;
    });

    const uniqueVehicles = new Set(
      periodRows.map((r) => String(r?.vehicle_number || "").trim()).filter(Boolean)
    ).size;

    const uniqueBatteries = new Set(
      periodRows
        .flatMap((r) => [r?.battery_out, r?.battery_in])
        .map((v) => String(v || "").trim())
        .filter(Boolean)
    ).size;

    return {
      swapsInPeriod: periodRows.length,
      swapsTotal: all.length,
      uniqueVehicles,
      uniqueBatteries,
    };
  }, [rows, kpiPeriod]);

  const loadAll = async () => {
    if (!user?.uid) return;
    try {
      setRowsLoading(true);
      setUsageLoading(true);
      const [swapList, usage] = await Promise.all([
        listBatterySwaps(user.uid),
        getBatteryUsage(user.uid),
      ]);
      setRows(swapList || []);
      setUsageRows(usage || []);
    } catch (e) {
      setRows([]);
      setUsageRows([]);
      setBanner({
        type: "error",
        message: e?.message || "Unable to load battery swaps. Check API/DB.",
      });
    } finally {
      setRowsLoading(false);
      setUsageLoading(false);
    }
  };

  useEffect(() => {
    if (!canLoad) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad]);

  const validate = () => {
    const next = {};
    const vehicleNumber = normalizeId(form.vehicleNumber);
    const batteryOut = normalizeId(form.batteryOut);
    const batteryIn = normalizeId(form.batteryIn);

    if (!vehicleNumber) next.vehicleNumber = "Vehicle number is required";
    if (!batteryOut) next.batteryOut = "Battery OUT is required";
    if (!batteryIn) next.batteryIn = "Battery IN is required";
    if (batteryOut && batteryIn && batteryOut === batteryIn) {
      next.batteryIn = "Battery IN must be different from Battery OUT";
    }

    setErrors(next);
    return { ok: Object.keys(next).length === 0, vehicleNumber, batteryOut, batteryIn };
  };

  const submit = async () => {
    if (!user?.uid) return;
    const v = validate();
    if (!v.ok) return;

    try {
      const created = await createBatterySwap({
        employee_uid: user.uid,
        employee_email: user.email || null,
        vehicle_number: v.vehicleNumber,
        battery_out: v.batteryOut,
        battery_in: v.batteryIn,
        notes: form.notes?.trim() || null,
      });

      setBanner({ type: "success", message: "Battery swap recorded." });
      setForm({ vehicleNumber: "", batteryOut: "", batteryIn: "", notes: "" });

      // Optimistic prepend, then refresh usage
      setRows((prev) => [created, ...prev]);
      setUsageLoading(true);
      const usage = await getBatteryUsage(user.uid);
      setUsageRows(usage || []);
    } catch (e) {
      setBanner({
        type: "error",
        message: e?.message || "Unable to save battery swap. Check API/DB.",
      });
    } finally {
      setUsageLoading(false);
    }
  };

  if (loading) return null;

  return (
    <EmployeeLayout>
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Operations
          </p>
          <h1 className="text-2xl font-semibold text-evegah-text">
            Battery Swaps
          </h1>
          <p className="text-sm text-gray-500">
            Record battery swap activity (battery OUT → battery IN) per vehicle.
          </p>
        </div>

        {banner && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              bannerStyles[banner.type] || bannerStyles.info
            }`}
          >
            {banner.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Battery Swaps"
            value={rowsLoading ? "—" : kpis.swapsInPeriod}
            helper="In selected period"
            period={kpiPeriod}
            onPeriodChange={setKpiPeriod}
            showPeriod
          />
          <KpiCard
            label="Total Swaps"
            value={rowsLoading ? "—" : kpis.swapsTotal}
            helper="Last 200 loaded"
            period={kpiPeriod}
            onPeriodChange={setKpiPeriod}
          />
          <KpiCard
            label="Vehicles"
            value={rowsLoading ? "—" : kpis.uniqueVehicles}
            helper="Unique vehicles (period)"
            period={kpiPeriod}
            onPeriodChange={setKpiPeriod}
          />
          <KpiCard
            label="Batteries"
            value={rowsLoading ? "—" : kpis.uniqueBatteries}
            helper="Unique IN/OUT (period)"
            period={kpiPeriod}
            onPeriodChange={setKpiPeriod}
          />
        </div>

        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-evegah-text">
                New Battery Swap
              </h2>
              <p className="text-sm text-gray-500">
                Enter vehicle number and battery IDs.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="label">Vehicle Number *</label>
              <input
                className="input"
                placeholder="GJ01AB1234"
                value={form.vehicleNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, vehicleNumber: e.target.value }))
                }
                onBlur={(e) =>
                  setForm((p) => ({ ...p, vehicleNumber: normalizeId(e.target.value) }))
                }
              />
              {errors.vehicleNumber && <p className="error">{errors.vehicleNumber}</p>}
            </div>

            <div>
              <label className="label">Battery OUT *</label>
              <input
                className="input"
                placeholder="BAT-001"
                list="ev-egah-battery-ids"
                value={form.batteryOut}
                onChange={(e) =>
                  setForm((p) => ({ ...p, batteryOut: e.target.value }))
                }
                onBlur={(e) =>
                  setForm((p) => ({ ...p, batteryOut: normalizeId(e.target.value) }))
                }
              />
              {errors.batteryOut && <p className="error">{errors.batteryOut}</p>}
            </div>

            <div>
              <label className="label">Battery IN *</label>
              <input
                className="input"
                placeholder="BAT-002"
                list="ev-egah-battery-ids"
                value={form.batteryIn}
                onChange={(e) =>
                  setForm((p) => ({ ...p, batteryIn: e.target.value }))
                }
                onBlur={(e) =>
                  setForm((p) => ({ ...p, batteryIn: normalizeId(e.target.value) }))
                }
              />
              {errors.batteryIn && <p className="error">{errors.batteryIn}</p>}
            </div>
          </div>

          <datalist id="ev-egah-battery-ids">
            {BATTERY_ID_OPTIONS.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>

          <div className="mt-4">
            <label className="label">Notes</label>
            <input
              className="input"
              placeholder="Optional"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button type="button" className="btn-primary" onClick={submit}>
              Save Swap
            </button>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-evegah-text">
                Most Used Batteries
              </h2>
              <p className="text-sm text-gray-500">
                Based on how many times a battery was installed (Battery IN).
              </p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-evegah-border">
                  <th className="py-2 pr-3 font-medium">Battery ID</th>
                  <th className="py-2 pr-3 font-medium">Installs</th>
                  <th className="py-2 pr-3 font-medium">Removals</th>
                </tr>
              </thead>
              <tbody>
                {usageLoading ? (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={3}>
                      Loading usage...
                    </td>
                  </tr>
                ) : usageRows.length === 0 ? (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={3}>
                      No usage data yet.
                    </td>
                  </tr>
                ) : (
                  usageRows.map((u) => (
                    <tr key={u.battery_id} className="border-b last:border-b-0">
                      <td className="py-3 pr-3">{u.battery_id}</td>
                      <td className="py-3 pr-3">{u.installs}</td>
                      <td className="py-3 pr-3">{u.removals}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-evegah-text">
                Swap Records
              </h2>
              <p className="text-sm text-gray-500">Recent battery swaps.</p>
            </div>
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
                {rowsLoading ? (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={6}>
                      Loading swaps...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="py-3 text-gray-500" colSpan={6}>
                      No battery swaps to show.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-3">{r.rider_full_name || "-"}</td>
                      <td className="py-3 pr-3">{r.rider_mobile || "-"}</td>
                      <td className="py-3 pr-3">{r.vehicle_number}</td>
                      <td className="py-3 pr-3">{r.battery_out}</td>
                      <td className="py-3 pr-3">{r.battery_in}</td>
                      <td className="py-3 pr-3 text-gray-500">
                        {r.swapped_at
                          ? new Date(r.swapped_at).toLocaleString()
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
    </EmployeeLayout>
  );
}
