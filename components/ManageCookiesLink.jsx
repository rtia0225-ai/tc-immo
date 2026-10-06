"use client";

export default function ManageCookiesLink({ className }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("tc-immo:open-cookie-settings"))}
      className={className}
    >
      Gérer mes cookies
    </button>
  );
}
