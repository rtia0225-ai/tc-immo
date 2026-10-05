// Redimensionne et compresse une image côté navigateur avant envoi, pour
// que les photos venant de banques d'images (souvent plusieurs Mo, haute
// résolution) ne dépassent jamais les limites d'envoi du serveur.
export async function compressImage(file, { maxDimension = 1400, quality = 0.85 } = {}) {
  if (!file.type.startsWith("image/")) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // format que le navigateur ne sait pas décoder : on laisse tel quel

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) return file;

  // Ne garde la version compressée que si elle est vraiment plus légère.
  if (blob.size >= file.size) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
