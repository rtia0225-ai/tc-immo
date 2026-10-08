"use client";

import { useRef, useState } from "react";
import { compressImage } from "@/lib/compressImage";

// Remplace le texte natif du navigateur ("Choose File" / "No file chosen",
// affiché dans la langue du navigateur, pas celle du site) par un bouton
// et un texte entièrement en français.
export default function FileInputButton({
  name,
  accept,
  required,
  multiple,
  label = "Choisir un fichier",
  className = "",
  autoSubmit = false,
  compress = false,
}) {
  const inputRef = useRef(null);
  const [fileNames, setFileNames] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Vérifie nous-mêmes le type de fichier : l'attribut "accept" n'est
  // qu'une suggestion pour la boîte de dialogue du navigateur, certains
  // navigateurs/systèmes laissent quand même sélectionner un fichier qui
  // ne correspond pas, sans aucun avertissement visible pour la personne.
  const isAcceptedType = (file) => {
    if (!accept) return true;
    const patterns = accept.split(",").map((p) => p.trim());
    return patterns.some((pattern) => {
      if (pattern.endsWith("/*")) return file.type.startsWith(pattern.replace("/*", "/"));
      if (pattern.startsWith(".")) return file.name.toLowerCase().endsWith(pattern.toLowerCase());
      return file.type === pattern;
    });
  };

  const handleChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setFileNames("");
      setError("");
      return;
    }

    const rejected = Array.from(files).find((f) => !isAcceptedType(f));
    if (rejected) {
      setError(
        `"${rejected.name}" n'est pas un format accepté${rejected.type ? ` (${rejected.type})` : ""}. Essayez une photo au format JPG ou PNG.`
      );
      setFileNames("");
      e.target.value = "";
      return;
    }
    setError("");

    let finalFiles = files;
    if (compress) {
      setBusy(true);
      try {
        const compressed = await Promise.all(Array.from(files).map((f) => compressImage(f)));
        // Remplace les fichiers de l'input par leur version compressée,
        // pour que ce soit bien ça qui parte à l'envoi.
        const dt = new DataTransfer();
        compressed.forEach((f) => dt.items.add(f));
        e.target.files = dt.files;
        finalFiles = dt.files;
      } catch {
        // En cas d'échec de compression, on envoie le fichier original tel quel.
      }
      setBusy(false);
    }

    if (finalFiles.length === 1) {
      setFileNames(finalFiles[0].name);
    } else {
      setFileNames(`${finalFiles.length} fichiers sélectionnés`);
    }
    if (autoSubmit) {
      e.target.form?.requestSubmit();
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={accept}
          required={required}
          multiple={multiple}
          onChange={handleChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="shrink-0 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-ink hover:bg-gray-200 disabled:opacity-60"
        >
          {busy ? "Compression..." : label}
        </button>
        <span className="truncate text-sm text-gray-500">
          {fileNames || "Aucun fichier choisi"}
        </span>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
