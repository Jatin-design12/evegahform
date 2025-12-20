import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../config/api";

export default function useLiveAnalytics({ zone, date }) {
  const [ridersData, setRidersData] = useState([]);
  const [earningsData, setEarningsData] = useState([]);
  const [zoneData, setZoneData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);

    try {
      const qsRiders = new URLSearchParams();
      if (zone) qsRiders.set("zone", zone);
      if (date) qsRiders.set("date", date);

      const qsEarnings = new URLSearchParams();
      if (date) qsEarnings.set("date", date);

      const [riders, earnings, zones] = await Promise.all([
        apiFetch(`/api/analytics/daily-riders?${qsRiders.toString()}`),
        apiFetch(`/api/analytics/daily-earnings?${qsEarnings.toString()}`),
        apiFetch("/api/analytics/zone-distribution"),
      ]);

      setRidersData(Array.isArray(riders) ? riders : []);
      setEarningsData(Array.isArray(earnings) ? earnings : []);
      setZoneData(Array.isArray(zones) ? zones : []);
    } finally {
      setLoading(false);
    }
  }, [zone, date]);

  useEffect(() => {
    fetchAnalytics();
    const timer = setInterval(fetchAnalytics, 15000);
    return () => clearInterval(timer);
  }, [fetchAnalytics]);

  return { ridersData, earningsData, zoneData, loading };
}
