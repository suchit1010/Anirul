export function formatPhone(phone: string): string {
  if (!phone) return "";
  if (phone.startsWith("+91") && phone.length === 13) {
    return `+91 ${phone.slice(3, 8)} ${phone.slice(8)}`;
  }
  return phone;
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const now = Date.now();
  const diff = now - ts;
  const day = 24 * 60 * 60 * 1000;
  if (diff < 60 * 1000) return "just now";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < day) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(ts).toLocaleDateString();
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function statusColor(status: string): { bg: string; fg: string; label: string } {
  const s = (status || "").toUpperCase();
  if (s === "CRITICAL") return { bg: "bg-red-100", fg: "text-red-700", label: "Critical" };
  if (s === "HIGH") return { bg: "bg-amber-100", fg: "text-amber-700", label: "High" };
  if (s === "LOW") return { bg: "bg-sky-100", fg: "text-sky-700", label: "Low" };
  return { bg: "bg-emerald-100", fg: "text-emerald-700", label: "Normal" };
}
