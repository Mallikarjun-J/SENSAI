"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

/**
 * Reusable styled delete-confirmation dialog built on Shadcn AlertDialog.
 *
 * Two usage modes:
 *  1. Trigger mode  — pass `trigger` prop; dialog opens when trigger is clicked.
 *  2. Controlled mode — pass `open` + `onOpenChange`; you control visibility yourself.
 */
export function ConfirmDeleteDialog({
  // Trigger mode
  trigger,
  // Controlled mode
  open,
  onOpenChange,
  // Content
  title = "Are you sure?",
  description = "This action cannot be undone.",
  // Action
  onConfirm,
  loading = false,
}) {
  const isControlled = open !== undefined;

  const dialogContent = (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle className="text-white font-semibold text-lg">{title}</AlertDialogTitle>
        <AlertDialogDescription className="text-zinc-400 text-sm">{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={loading} className="border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white">Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          disabled={loading}
          className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
        >
          {loading ? "Deleting…" : "Delete"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );

  if (isControlled) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        {dialogContent}
      </AlertDialog>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger}
      </AlertDialogTrigger>
      {dialogContent}
    </AlertDialog>
  );
}
