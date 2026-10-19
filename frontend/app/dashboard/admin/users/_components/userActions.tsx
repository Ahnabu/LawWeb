"use client";

import { toast } from "sonner";
import { confirmDialog } from "../../../../../components/ConfirmDialog";
import {
  blockUser,
  deleteUser,
  getUserDetails,
  unblockUser,
  userStatusOf,
  USER_STATUS_LABELS,
  type BlockState,
  type ManagedUser,
  type UserStats,
} from "../../../../../lib/adminUsers";

type Target = Pick<ManagedUser, "_id" | "name" | "email">;

// Neutral chip with a small coloured dot per account status
const STATUS_DOTS: Record<string, string> = {
  active: "bg-success",
  blocked: "bg-error",
  unverified: "bg-secondary",
};

const errorText = (error: unknown, fallback: string) => (error instanceof Error && error.message ? error.message : fallback);

/** Sends the block request (the reason dialog has already been confirmed) */
export async function performBlock(user: Target, reason: string): Promise<BlockState | null> {
  try {
    const result = await blockUser(user._id, reason);
    toast.success(result.message || `${user.name} has been blocked.`);
    return result.data;
  } catch (error) {
    toast.error(errorText(error, "Failed to block user"));
    return null;
  }
}

export async function confirmAndUnblock(user: Target): Promise<BlockState | null> {
  const confirmed = await confirmDialog({
    title: `Unblock ${user.name}?`,
    message: "They will be able to log in and use their account again.",
    confirmLabel: "Unblock",
  });
  if (!confirmed) return null;

  try {
    const result = await unblockUser(user._id);
    toast.success(result.message || `${user.name} has been unblocked.`);
    return result.data;
  } catch (error) {
    toast.error(errorText(error, "Failed to unblock user"));
    return null;
  }
}

/**
 * Danger confirmation (type the email) then delete. Pass `stats` when the
 * caller already has them; otherwise they are fetched so the dialog can show
 * real numbers. Returns true when the account was deleted.
 */
export async function confirmAndDelete(user: Target, stats?: Pick<UserStats, "totalCases" | "upcomingConsultations">): Promise<boolean> {
  let impact = stats;
  if (!impact) {
    try {
      impact = (await getUserDetails(user._id)).stats;
    } catch {
      // The dialog still lists the consequences, just without numbers
    }
  }

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  const confirmed = await confirmDialog({
    title: `Delete ${user.name}'s account?`,
    message: "This permanently removes the client account and cannot be undone.",
    confirmLabel: "Delete account",
    tone: "danger",
    confirmPhrase: user.email,
    details: (
      <ul className="list-disc space-y-1 pl-5">
        <li>They are signed out everywhere and can no longer log in.</li>
        <li>
          {impact
            ? `${plural(impact.upcomingConsultations, "upcoming appointment")} will be cancelled and the time slots freed.`
            : "Their upcoming appointments will be cancelled and the time slots freed."}
        </li>
        <li>
          {impact
            ? `${plural(impact.totalCases, "case")} will be kept but unlinked from the account (client name and email stay on each case).`
            : "Their cases are kept but unlinked from the account (client name and email stay on each case)."}
        </li>
        <li>Past appointment records are kept for the firm&apos;s history.</li>
      </ul>
    ),
  });
  if (!confirmed) return false;

  try {
    const result = await deleteUser(user._id);
    const { cancelledConsultations, detachedCases } = result.data ?? { cancelledConsultations: 0, detachedCases: 0 };
    const extras = [
      cancelledConsultations ? plural(cancelledConsultations, "appointment") + " cancelled" : "",
      detachedCases ? plural(detachedCases, "case") + " unlinked" : "",
    ].filter(Boolean);
    toast.success(result.message || "Account deleted", extras.length ? { description: extras.join(", ") } : undefined);
    return true;
  } catch (error) {
    toast.error(errorText(error, "Failed to delete user"));
    return false;
  }
}

export function UserStatusBadge({ user }: { user: Pick<ManagedUser, "isBlocked" | "isVerified"> }) {
  const status = userStatusOf(user);
  return (
    <span className="chip whitespace-nowrap">
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status] ?? "bg-outline"}`} />
      {USER_STATUS_LABELS[status]}
    </span>
  );
}

export function UserAvatar({ name, imageUrl, size = "md" }: { name: string; imageUrl?: string; size?: "md" | "lg" }) {
  const dimension = size === "lg" ? "h-16 w-16 text-xl" : "h-9 w-9 text-sm";
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?";

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote avatar host is not in next.config images
      <img src={imageUrl} alt="" className={`${dimension} shrink-0 rounded-full border border-outline-variant object-cover`} />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${dimension} monogram`}
    >
      {initials}
    </span>
  );
}
