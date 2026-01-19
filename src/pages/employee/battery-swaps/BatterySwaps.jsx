import { useEffect, useMemo, useRef, useState } from "react";

import EmployeeLayout from "../../../components/layouts/EmployeeLayout";
import useAuth from "../../../hooks/useAuth";
import {
  createBatterySwap,
  getBatteryUsage,
  listBatterySwaps,
} from "../../../utils/batterySwaps";
import { BATTERY_ID_OPTIONS } from "../../../utils/batteryIds";
import { VEHICLE_ID_OPTIONS } from "../../../utils/vehicleIds";
import { apiFetch } from "../../../config/api";
import { formatDateTimeDDMMYYYY } from "../../../utils/dateFormat";

const normalizeId = (value) => String(value || "").trim().toUpperCase();
const normalizeForCompare = (value) =>
  String(value || "").replace(/[^a-z0-9]+/gi, "").toUpperCase();

const bannerStyles = {
  success: "bg-green-50 border-green-200 text-green-700",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
  info: "bg-blue-50 border-blue-200 text-blue-700",
  error: "bg-red-50 border-red-200 text-red-700",
};

function KpiCard({ label, value, helper, period, onPeriodChange, showPeriod, tone = "indigo" }) {
  const tones = {
    indigo: "from-indigo-50 to-white border-indigo-200/70",
    emerald: "from-emerald-50 to-white border-emerald-200/70",
    amber: "from-amber-50 to-white border-amber-200/70",
    rose: "from-rose-50 to-white border-rose-200/70",
  };

  return (
    <div className={`rounded-2xl border bg-gradient-to-br shadow-card p-5 ${tones[tone] || tones.indigo}`}>
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
    riderId: "",
    riderName: "",
    riderPhone: "",
    vehicleNumber: "",
    batteryOut: "",
    batteryIn: "",
    notes: "",
  });

  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);

  const riderDropdownRef = useRef(null);
  const riderQueryRef = useRef(null);
  const vehicleDropdownRef = useRef(null);
  const vehicleQueryRef = useRef(null);
  const batteryOutDropdownRef = useRef(null);
  const batteryInDropdownRef = useRef(null);
  const batteryOutQueryRef = useRef(null);
  const batteryInQueryRef = useRef(null);

  const [riderOptions, setRiderOptions] = useState([]);
  const [riderLoading, setRiderLoading] = useState(true);
  const [riderQuery, setRiderQuery] = useState("");
  const [riderDropdownOpen, setRiderDropdownOpen] = useState(false);

  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [vehicleQuery, setVehicleQuery] = useState("");

  const [batteryOutDropdownOpen, setBatteryOutDropdownOpen] = useState(false);
  const [batteryOutQuery, setBatteryOutQuery] = useState("");
  const [batteryInDropdownOpen, setBatteryInDropdownOpen] = useState(false);
  const [batteryInQuery, setBatteryInQuery] = useState("");

  const canLoad = useMemo(() => !loading && Boolean(user?.uid), [loading, user?.uid]);

  const usageMax = useMemo(() => {
    const all = Array.isArray(usageRows) ? usageRows : [];
    const max = all.reduce((m, r) => Math.max(m, Number(r?.installs || 0), Number(r?.removals || 0)), 0);
    return max > 0 ? max : 1;
  }, [usageRows]);

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

  useEffect(() => {
    let mounted = true;
    setRiderLoading(true);
    apiFetch("/api/riders?limit=200")
      .then((result) => {
        if (!mounted) return;
        setRiderOptions(Array.isArray(result?.data) ? result.data : []);
      })
      .catch(() => {
        if (!mounted) return;
        setRiderOptions([]);
      })
      .finally(() => {
        if (!mounted) return;
        setRiderLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (
      !vehicleDropdownOpen &&
      !batteryOutDropdownOpen &&
      !batteryInDropdownOpen &&
      !riderDropdownOpen
    ) {
      return undefined;
    }

    const onMouseDown = (event) => {
      const target = event.target;
      if (vehicleDropdownOpen && vehicleDropdownRef.current && !vehicleDropdownRef.current.contains(target)) {
        setVehicleDropdownOpen(false);
      }
      if (batteryOutDropdownOpen && batteryOutDropdownRef.current && !batteryOutDropdownRef.current.contains(target)) {
        setBatteryOutDropdownOpen(false);
      }
      if (batteryInDropdownOpen && batteryInDropdownRef.current && !batteryInDropdownRef.current.contains(target)) {
        setBatteryInDropdownOpen(false);
      }
      if (riderDropdownOpen && riderDropdownRef.current && !riderDropdownRef.current.contains(target)) {
        setRiderDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [
    vehicleDropdownOpen,
    batteryOutDropdownOpen,
    batteryInDropdownOpen,
    riderDropdownOpen,
  ]);

  const filteredVehicleIds = useMemo(() => {
    const query = String(vehicleQuery || "").trim().toUpperCase();
    if (!query) return VEHICLE_ID_OPTIONS;
    return VEHICLE_ID_OPTIONS.filter((id) => id.includes(query));
  }, [vehicleQuery]);

  const filteredBatteryOutIds = useMemo(() => {
    const query = String(batteryOutQuery || "").trim().toUpperCase();
    if (!query) return BATTERY_ID_OPTIONS;
    return BATTERY_ID_OPTIONS.filter((id) => id.includes(query));
  }, [batteryOutQuery]);

  const filteredBatteryInIds = useMemo(() => {
    const query = String(batteryInQuery || "").trim().toUpperCase();
    if (!query) return BATTERY_ID_OPTIONS;
    return BATTERY_ID_OPTIONS.filter((id) => id.includes(query));
  }, [batteryInQuery]);

  const filteredRiders = useMemo(() => {
    const query = String(riderQuery || "").trim().toLowerCase();
    if (!query) return riderOptions;
    return (riderOptions || []).filter((r) => {
      const haystack = `${String(r?.full_name || "").toLowerCase()} ${String(r?.mobile || "").toLowerCase()} ${String(r?.aadhaar || "").toLowerCase()}`;
      return haystack.includes(query);
    });
  }, [riderOptions, riderQuery]);

  const selectRider = async (rider) => {
    const riderName = rider?.full_name || "";
    const riderPhone = String(rider?.mobile || "").replace(/\D+/g, "");

    setForm((prev) => ({
      ...prev,
      riderId: rider?.id || "",
      riderName,
      riderPhone,
    }));
    setRiderDropdownOpen(false);
    setRiderQuery("");

    if (!riderPhone) return;

    try {
      const active = await apiFetch(`/api/rentals/active?mobile=${encodeURIComponent(riderPhone)}`);
      if (!active) {
        setBanner({
          type: "warning",
          message: "No active rental found for this rider. Please select vehicle and battery OUT manually.",
        });
        return;
      }

      const vehicleNumber = normalizeId(active?.vehicle_number || "");
      const batteryOut = normalizeId(active?.current_battery_id || "");

      setForm((prev) => ({
        ...prev,
        vehicleNumber: vehicleNumber || prev.vehicleNumber,
        batteryOut: batteryOut || prev.batteryOut,
      }));
    } catch {
      setBanner({
        type: "warning",
        message: "Unable to auto-fill vehicle/battery from active rental. Please select manually.",
      });
    }
  };

  const selectVehicleId = (id) => {
    setForm((prev) => ({ ...prev, vehicleNumber: id }));
    setVehicleDropdownOpen(false);
    setVehicleQuery("");
  };

  const selectBatteryOutId = (id) => {
    setForm((prev) => ({ ...prev, batteryOut: id }));
    setBatteryOutDropdownOpen(false);
    setBatteryOutQuery("");
  };

  const selectBatteryInId = (id) => {
    setForm((prev) => ({ ...prev, batteryIn: id }));
    setBatteryInDropdownOpen(false);
    setBatteryInQuery("");
  };

  const loadAll = async () => {
    if (!user?.uid) return;
    try {
      setRowsLoading(true);
      setUsageLoading(true);
      const [swapList, usage] = await Promise.all([
        listBatterySwaps(),
        getBatteryUsage(),
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
      setForm({
        riderId: "",
        riderName: "",
        riderPhone: "",
        vehicleNumber: "",
        batteryOut: "",
        batteryIn: "",
        notes: "",
      });

      // Optimistic prepend, then refresh usage
      setRows((prev) => [created, ...prev]);
      setUsageLoading(true);
      const usage = await getBatteryUsage();
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
        <div className="rounded-3xl border border-evegah-border bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-6 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Operations
          </p>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-evegah-text">
                Battery Swaps
              </h1>
              <p className="text-sm text-gray-600">
                Record battery swap activity (battery OUT → battery IN) per vehicle.
              </p>
            </div>
            <div className="text-xs text-gray-500">
              Live view of swaps and battery usage
            </div>
          </div>
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
            tone="indigo"
          />
          <KpiCard
            label="Total Swaps"
            value={rowsLoading ? "—" : kpis.swapsTotal}
            helper="All loaded"
            period={kpiPeriod}
            onPeriodChange={setKpiPeriod}
            tone="emerald"
          />
          <KpiCard
            label="Vehicles"
            value={rowsLoading ? "—" : kpis.uniqueVehicles}
            helper="Unique vehicles (period)"
            period={kpiPeriod}
            onPeriodChange={setKpiPeriod}
            tone="amber"
          />
          <KpiCard
            label="Batteries"
            value={rowsLoading ? "—" : kpis.uniqueBatteries}
            helper="Unique IN/OUT (period)"
            period={kpiPeriod}
            onPeriodChange={setKpiPeriod}
            tone="rose"
          />
        </div>

        <div className="card border-0 bg-gradient-to-br from-white to-indigo-50/40 shadow-card">
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

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div>
              <label className="label">Rider (optional)</label>
              <div ref={riderDropdownRef} className="relative">
                <button
                  type="button"
                  className="select flex items-center justify-between gap-3"
                  aria-haspopup="listbox"
                  aria-expanded={riderDropdownOpen}
                  onClick={() => {
                    setRiderDropdownOpen((prev) => {
                      const next = !prev;
                      if (!prev && next) {
                        setTimeout(() => riderQueryRef.current?.focus(), 0);
                      }
                      return next;
                    });
                  }}
                >
                  <span className={form.riderName ? "text-evegah-text" : "text-gray-500"}>
                    {form.riderName
                      ? `${form.riderName} • ${form.riderPhone || "—"}`
                      : riderLoading
                        ? "Loading riders..."
                        : "Select rider"}
                  </span>
                  <span className="text-gray-400">▾</span>
                </button>

                {riderDropdownOpen ? (
                  <div className="absolute z-20 mt-2 w-full rounded-xl border border-evegah-border bg-white shadow-card p-2">
                    <input
                      ref={riderQueryRef}
                      className="input"
                      placeholder="Search rider name / phone..."
                      value={riderQuery}
                      onChange={(e) => setRiderQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setRiderDropdownOpen(false);
                        }
                      }}
                    />
                    <div className="mt-2 max-h-48 overflow-y-auto" role="listbox">
                      {riderLoading ? (
                        <div className="px-3 py-2 text-sm text-gray-500">Loading riders...</div>
                      ) : filteredRiders.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No matching riders.</div>
                      ) : (
                        filteredRiders.map((rider) => {
                          const label = rider?.full_name || rider?.mobile || "Unknown rider";
                          const sub = rider?.mobile || rider?.aadhaar || "";
                          const selected = normalizeForCompare(rider?.id) === normalizeForCompare(form.riderId);
                          return (
                            <button
                              key={rider.id ?? `${label}-${sub}`}
                              type="button"
                              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                                selected ? "bg-gray-100" : "hover:bg-gray-50"
                              }`}
                              onClick={() => selectRider(rider)}
                            >
                              <p className="text-sm font-medium text-evegah-text">{label}</p>
                              <p className="text-xs text-gray-500">{sub || "—"}</p>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <label className="label">Vehicle Number *</label>
              <div ref={vehicleDropdownRef} className="relative">
                <button
                  type="button"
                  className="select flex items-center justify-between gap-3"
                  aria-haspopup="listbox"
                  aria-expanded={vehicleDropdownOpen}
                  onClick={() => {
                    setVehicleDropdownOpen((prev) => {
                      const next = !prev;
                      if (!prev && next) {
                        setTimeout(() => vehicleQueryRef.current?.focus(), 0);
                      }
                      return next;
                    });
                  }}
                >
                  <span className={form.vehicleNumber ? "text-evegah-text" : "text-gray-500"}>
                    {form.vehicleNumber || "Select E-bike ID"}
                  </span>
                  <span className="text-gray-400">▾</span>
                </button>

                {vehicleDropdownOpen ? (
                  <div className="absolute z-20 mt-2 w-full rounded-xl border border-evegah-border bg-white shadow-card p-2">
                    <input
                      ref={vehicleQueryRef}
                      className="input"
                      placeholder="Search vehicle id..."
                      value={vehicleQuery}
                      onChange={(e) => setVehicleQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setVehicleDropdownOpen(false);
                        }
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (filteredVehicleIds.length === 1) {
                            selectVehicleId(filteredVehicleIds[0]);
                          }
                        }
                      }}
                    />
                    <div className="mt-2 max-h-48 overflow-y-auto" role="listbox">
                      {filteredVehicleIds.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No matching vehicle.</div>
                      ) : (
                        filteredVehicleIds.map((id) => {
                          const selected = normalizeForCompare(id) === normalizeForCompare(form.vehicleNumber);
                          return (
                            <button
                              key={id}
                              type="button"
                              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                                selected ? "bg-gray-100" : "hover:bg-gray-50"
                              }`}
                              onClick={() => selectVehicleId(id)}
                            >
                              {id}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              {errors.vehicleNumber && <p className="error">{errors.vehicleNumber}</p>}
            </div>

            <div>
              <label className="label">Battery REMOVE *</label>
              <div ref={batteryOutDropdownRef} className="relative">
                <button
                  type="button"
                  className="select flex items-center justify-between gap-3"
                  aria-haspopup="listbox"
                  aria-expanded={batteryOutDropdownOpen}
                  onClick={() => {
                    setBatteryOutDropdownOpen((prev) => {
                      const next = !prev;
                      if (!prev && next) {
                        setTimeout(() => batteryOutQueryRef.current?.focus(), 0);
                      }
                      return next;
                    });
                  }}
                >
                  <span className={form.batteryOut ? "text-evegah-text" : "text-gray-500"}>
                    {form.batteryOut || "Select battery out"}
                  </span>
                  <span className="text-gray-400">▾</span>
                </button>

                {batteryOutDropdownOpen ? (
                  <div className="absolute z-20 mt-2 w-full rounded-xl border border-evegah-border bg-white shadow-card p-2">
                    <input
                      ref={batteryOutQueryRef}
                      className="input"
                      placeholder="Search battery id..."
                      value={batteryOutQuery}
                      onChange={(e) => setBatteryOutQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setBatteryOutDropdownOpen(false);
                        }
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (filteredBatteryOutIds.length === 1) {
                            selectBatteryOutId(filteredBatteryOutIds[0]);
                          }
                        }
                      }}
                    />
                    <div className="mt-2 max-h-48 overflow-y-auto" role="listbox">
                      {filteredBatteryOutIds.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No battery matches.</div>
                      ) : (
                        filteredBatteryOutIds.map((id) => {
                          const selected = normalizeForCompare(id) === normalizeForCompare(form.batteryOut);
                          return (
                            <button
                              key={id}
                              type="button"
                              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                                selected ? "bg-gray-100" : "hover:bg-gray-50"
                              }`}
                              onClick={() => selectBatteryOutId(id)}
                            >
                              {id}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              {errors.batteryOut && <p className="error">{errors.batteryOut}</p>}
            </div>
          </div>

          <div className="mt-4">
            <label className="label">Battery ADD *</label>
            <div ref={batteryInDropdownRef} className="relative">
              <button
                type="button"
                className="select flex items-center justify-between gap-3"
                aria-haspopup="listbox"
                aria-expanded={batteryInDropdownOpen}
                onClick={() => {
                  setBatteryInDropdownOpen((prev) => {
                    const next = !prev;
                    if (!prev && next) {
                      setTimeout(() => batteryInQueryRef.current?.focus(), 0);
                    }
                    return next;
                  });
                }}
              >
                <span className={form.batteryIn ? "text-evegah-text" : "text-gray-500"}>
                  {form.batteryIn || "Select battery in"}
                </span>
                <span className="text-gray-400">▾</span>
              </button>

              {batteryInDropdownOpen ? (
                <div className="absolute z-20 mt-2 w-full rounded-xl border border-evegah-border bg-white shadow-card p-2">
                  <input
                    ref={batteryInQueryRef}
                    className="input"
                    placeholder="Search battery id..."
                    value={batteryInQuery}
                    onChange={(e) => setBatteryInQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setBatteryInDropdownOpen(false);
                      }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (filteredBatteryInIds.length === 1) {
                          selectBatteryInId(filteredBatteryInIds[0]);
                        }
                      }
                    }}
                  />
                  <div className="mt-2 max-h-48 overflow-y-auto" role="listbox">
                    {filteredBatteryInIds.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">No battery matches.</div>
                    ) : (
                      filteredBatteryInIds.map((id) => {
                        const selected = normalizeForCompare(id) === normalizeForCompare(form.batteryIn);
                        return (
                          <button
                            key={id}
                            type="button"
                            className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                              selected ? "bg-gray-100" : "hover:bg-gray-50"
                            }`}
                            onClick={() => selectBatteryInId(id)}
                          >
                            {id}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : null}
            </div>
            {errors.batteryIn && <p className="error">{errors.batteryIn}</p>}
          </div>

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
            <button type="button" className="btn-primary shadow-sm" onClick={submit}>
              Save Swap
            </button>
          </div>
        </div>

        <div className="card border-0 bg-gradient-to-br from-white to-emerald-50/40 shadow-card">
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

          {usageLoading ? (
            <div className="mt-4 text-sm text-gray-500">Loading usage...</div>
          ) : usageRows.length === 0 ? (
            <div className="mt-4 text-sm text-gray-500">No usage data yet.</div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {usageRows.map((u, idx) => {
                const installs = Number(u?.installs || 0);
                const removals = Number(u?.removals || 0);
                const installsPct = Math.max(0, Math.min(100, (installs / usageMax) * 100));
                const removalsPct = Math.max(0, Math.min(100, (removals / usageMax) * 100));
                const rank = idx + 1;

                return (
                  <div
                    key={u.battery_id}
                    className="rounded-2xl border border-evegah-border bg-white/80 p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Battery</p>
                        <p className="text-sm font-semibold text-evegah-text">{u.battery_id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">#{rank}</span>
                        {rank <= 3 ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Hot
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Installs</span>
                          <span className="font-medium text-emerald-700">{installs}</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-emerald-100">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                            style={{ width: `${installsPct}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600">Removals</span>
                          <span className="font-medium text-indigo-700">{removals}</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-indigo-100">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"
                            style={{ width: `${removalsPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                        {formatDateTimeDDMMYYYY(r.swapped_at, "-")}
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
