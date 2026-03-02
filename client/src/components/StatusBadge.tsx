import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  
  const getColors = () => {
    switch(normalized) {
      case "registered":
      case "received":
        return "bg-teal-500/20 text-teal-300 border-teal-500/30";
      case "transferred":
      case "shipped":
      case "ready to ship":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "processing":
      case "preparing":
      case "packed":
        return "bg-violet-500/20 text-violet-300 border-violet-500/30";
      case "flagged":
      case "suspicious":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  return (
    <span className={cn("px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm", getColors())}>
      {status.toUpperCase()}
    </span>
  );
}
