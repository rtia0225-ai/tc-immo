"use client";

import { useState } from "react";

export default function PasswordField({ name = "password", required = true, minLength, placeholder, className = "" }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        name={name}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-gray-300 p-2 pr-16 ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 hover:text-brand"
      >
        {show ? "Masquer" : "Afficher"}
      </button>
    </div>
  );
}
