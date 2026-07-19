window.MediStorage = (() => {
  const KEYS = {
    PROFILE: "medicheck_profile_v2",
    REPORTS: "medicheck_reports_v2"
  };

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  };

  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  };

  return {
    getProfile() { return read(KEYS.PROFILE, null); },
    saveProfile(profile) { return write(KEYS.PROFILE, profile); },
    getReports() { return read(KEYS.REPORTS, []); },
    saveReport(report) {
      const reports = read(KEYS.REPORTS, []);
      reports.unshift(report);
      return write(KEYS.REPORTS, reports.slice(0, 30));
    },
    deleteReport(id) {
      const reports = read(KEYS.REPORTS, []).filter(item => item.id !== id);
      return write(KEYS.REPORTS, reports);
    },
    clearReports() { return write(KEYS.REPORTS, []); }
  };
})();
