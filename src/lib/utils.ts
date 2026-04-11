import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const COLLEGE_EMAIL_DOMAIN = "jspm.edu.in";

export function isValidCollegeEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const parts = normalized.split("@");

  return parts.length === 2 && parts[0].length > 0 && parts[1] === COLLEGE_EMAIL_DOMAIN;
}

export function formatDateTime(input: string | Date) {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function randomToken(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
