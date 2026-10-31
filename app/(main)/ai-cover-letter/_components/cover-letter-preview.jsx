"use client";

import React, { useState } from "react";
import MDEditor from "@uiw/react-md-editor";
import rehypeSanitize from "rehype-sanitize";
import { Button } from "@/components/ui/button";
import { Copy, Check, Eye, Edit3, Sparkles, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateCoverLetter, getUserContactInfo } from "@/actions/cover-letter";

/** Convert raw markdown into clean plain text for pasting without syntax artifacts (e.g. asterisks) */
function markdownToPlainText(md) {
  if (!md) return "";
  return md
    // Bold & italic
    .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/___(.*?)___/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    // Headers
    .replace(/^#{1,6}\s+/gm, "")
    // Links [text](url) -> url if text is placeholder or identical, else text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      return text.trim() === url.trim() ? text : `${text} (${url})`;
    })
    // Blockquotes
    .replace(/^>\s+/gm, "")
    // Horizontal rules
    .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, "")
    .trim();
}

const CoverLetterPreview = ({ content: initialContent = "", id }) => {
  const [content, setContent] = useState(initialContent);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);

  // Copy clean formatted letter (without ** or raw markdown syntax)
  const handleCopyClean = async () => {
    const plainText = markdownToPlainText(content);
    try {
      if (typeof window !== "undefined" && navigator.clipboard && window.ClipboardItem) {
        // Rich text HTML version for email clients and word processors
        const htmlFormatted = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #111; white-space: pre-line;">${
          content
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
        }</div>`;

        const plainBlob = new Blob([plainText], { type: "text/plain" });
        const htmlBlob = new Blob([htmlFormatted], { type: "text/html" });

        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": plainBlob,
            "text/html": htmlBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
      setCopied(true);
      toast.success("Copied clean cover letter (no markdown syntax)!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      toast.success("Copied clean cover letter!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await updateCoverLetter(id, content);
      toast.success("Cover letter saved successfully!");
      setIsEditing(false);
    } catch {
      toast.error("Failed to save cover letter");
    } finally {
      setSaving(false);
    }
  };

  const handleAutoFill = async () => {
    setAutoFilling(true);
    try {
      const info = await getUserContactInfo();
      if (!info) {
        toast.error("Could not fetch user profile/resume info.");
        return;
      }

      let updated = content;
      let filledCount = 0;

      if (info.hasRealName && info.candidateName !== "[Your Name]") {
        if (/\[(?:Your Name|Candidate Name|Full Name|Name)\]/i.test(updated)) {
          updated = updated.replace(/\[(?:Your Name|Candidate Name|Full Name|Name)\]/gi, info.candidateName);
          filledCount++;
        }
      }
      if (info.hasRealEmail && info.candidateEmail !== "[Your Email]") {
        if (/\[(?:Your Email|Candidate Email|Email Address|Email)\]/i.test(updated)) {
          updated = updated.replace(/\[(?:Your Email|Candidate Email|Email Address|Email)\]/gi, info.candidateEmail);
          filledCount++;
        }
      }
      if (info.hasRealPhone && info.candidatePhone !== "[Your Phone Number]") {
        if (/\[(?:Your Phone Number|Your Phone|Candidate Phone|Phone Number|Phone)\]/i.test(updated)) {
          updated = updated.replace(/\[(?:Your Phone Number|Your Phone|Candidate Phone|Phone Number|Phone)\]/gi, info.candidatePhone);
          filledCount++;
        }
      }
      if (info.hasRealLink && info.candidateLink !== "[Your LinkedIn Profile/Portfolio URL]") {
        if (/\[(?:Your LinkedIn Profile\/Portfolio URL|Your LinkedIn Profile|Your Portfolio URL|LinkedIn Profile|Portfolio URL|LinkedIn\/Portfolio URL|Your Portfolio\/LinkedIn URL)\]/i.test(updated)) {
          updated = updated.replace(
            /\[(?:Your LinkedIn Profile\/Portfolio URL|Your LinkedIn Profile|Your Portfolio URL|LinkedIn Profile|Portfolio URL|LinkedIn\/Portfolio URL|Your Portfolio\/LinkedIn URL)\]/gi,
            info.candidateLink
          );
          filledCount++;
        }
      }
      if (/\[(?:Date|Today's Date|Current Date)\]/i.test(updated)) {
        updated = updated.replace(/\[(?:Date|Today's Date|Current Date)\]/gi, info.currentDate);
        filledCount++;
      }

      if (updated === content) {
        toast.info("No matching placeholders found to fill.");
      } else {
        setContent(updated);
        toast.success(`Filled ${filledCount} detail${filledCount === 1 ? "" : "s"} from your profile/resume!`);
      }
    } catch {
      toast.error("Failed to auto-fill details");
    } finally {
      setAutoFilling(false);
    }
  };

  return (
    <div className="py-4 space-y-3">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-2 px-3">
        {/* Mode switch */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={!isEditing ? "secondary" : "ghost"}
            onClick={() => setIsEditing(false)}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
          <Button
            type="button"
            size="sm"
            variant={isEditing ? "secondary" : "ghost"}
            onClick={() => setIsEditing(true)}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Edit
          </Button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAutoFill}
            disabled={autoFilling}
            className="h-8 gap-1.5 text-xs font-medium border-primary/30 hover:border-primary/60 text-primary hover:text-primary"
            title="Replace [Your Name], [Your Email], etc. with available profile/resume data"
          >
            {autoFilling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Fill Available Info
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCopyClean}
            className="h-8 gap-1.5 text-xs font-medium"
            title="Copy clean letter without markdown asterisks or syntax"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Copied Clean
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Clean Text
              </>
            )}
          </Button>

          {id && (
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="h-8 gap-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* Markdown Editor / Preview with line-break preservation */}
      <div
        className="rounded-xl overflow-hidden border border-white/10 [&_.wmde-markdown]:!whitespace-pre-line [&_.wmde-markdown_p]:!whitespace-pre-line [&_.wmde-markdown_div]:!whitespace-pre-line [&_.w-md-editor-preview]:!whitespace-pre-line [&_.w-md-editor-preview_p]:!whitespace-pre-line"
        data-color-mode="dark"
      >
        <MDEditor
          value={content}
          onChange={(val) => setContent(val ?? "")}
          preview={isEditing ? "edit" : "preview"}
          height={700}
          previewOptions={{
            style: {
              whiteSpace: "pre-line",
            },
            rehypePlugins: [[rehypeSanitize]],
          }}
        />
      </div>
    </div>
  );
};

export default CoverLetterPreview;
