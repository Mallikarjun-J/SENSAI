"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteVoiceInterview } from "@/actions/interview";

export default function DeleteInterviewButton({ interviewId, role }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${role} Interview"? This will also remove all feedback.`)) return;
    setLoading(true);
    try {
      await deleteVoiceInterview(interviewId);
      toast.success("Interview deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete interview");
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="w-8 h-8 rounded-lg border border-white/10 bg-background flex items-center justify-center text-muted-foreground hover:text-red-400 hover:border-red-500/30 transition-colors disabled:opacity-50"
      title="Delete interview"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </button>
  );
}
