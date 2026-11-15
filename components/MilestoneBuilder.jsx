"use client";

import { useState, useEffect } from "react";
import { SINGLE_INSTALLMENT_TRADES, FINAL_DOCUMENT_TRADES, MIN_INSTALLMENTS_OTHER_TRADES, DEFAULT_MILESTONES_BY_TRADE } from "@/lib/constants";

export default function MilestoneBuilder({ trade, initialRows }) {
  const singleInstallmentDoc = SINGLE_INSTALLMENT_TRADES[trade]; // ex: "ACD" (Topographe)
  const isSingleInstallment = !!singleInstallmentDoc;
  // Architecture / Ingénieur génie civil : plusieurs étapes bien réelles,
  // mais PAS de minimum imposé de 5 — le nombre de versements (1, 2, 3...)
  // se négocie librement avec le professionnel.
  const finalDocumentLabel = FINAL_DOCUMENT_TRADES[trade];
  const isFlexibleMinimum = !!finalDocumentLabel;
  const defaultSchedule = DEFAULT_MILESTONES_BY_TRADE[trade]; // point de départ, toujours modifiable

  // initialRows : utilisé quand le professionnel corrige une proposition
  // déjà envoyée (après une demande de modification du client) — on
  // repart de ce qu'il avait déjà rempli, pas de l'exemple générique.
  const startingRows = initialRows && initialRows.length > 0 ? initialRows.map((r) => ({ ...r })) : null;

  // Livrable par défaut = le titre de l'étape (ex: "Esquisse" → livrable
  // attendu "Esquisse") — point de départ simple, toujours modifiable.
  const withDeliverable = (list) => list.map((r) => ({ deliverable: r.title, ...r }));

  const [rows, setRows] = useState(
    isSingleInstallment
      ? [{ title: `Livraison du ${singleInstallmentDoc}`, percentage: "100", deliverable: singleInstallmentDoc }]
      : startingRows
        ? startingRows
        : defaultSchedule
          ? withDeliverable(defaultSchedule)
          : [
              { title: "", percentage: "", deliverable: "" },
              { title: "", percentage: "", deliverable: "" },
              { title: "", percentage: "", deliverable: "" },
              { title: "", percentage: "", deliverable: "" },
              { title: "", percentage: "", deliverable: "" },
            ]
  );

  // Si le métier change après coup (rare, mais par sécurité) — ne
  // s'applique pas quand on repart d'une proposition déjà remplie.
  useEffect(() => {
    if (startingRows) return;
    if (isSingleInstallment) {
      setRows([{ title: `Livraison du ${singleInstallmentDoc}`, percentage: "100", deliverable: singleInstallmentDoc }]);
    } else if (defaultSchedule) {
      setRows(withDeliverable(defaultSchedule));
    }
  }, [trade]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateRow = (i, field, value) => {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));
  };

  const addRow = () => setRows((r) => [...r, { title: "", percentage: "", deliverable: "" }]);
  const canRemoveRow = (currentLength) =>
    !isSingleInstallment && (isFlexibleMinimum ? currentLength > 1 : currentLength > MIN_INSTALLMENTS_OTHER_TRADES);
  const removeRow = (i) => {
    if (canRemoveRow(rows.length)) {
      setRows((r) => r.filter((_, idx) => idx !== i));
    }
  };

  const total = rows.reduce((sum, r) => sum + (parseFloat(r.percentage) || 0), 0);

  // Une seule ligne de règle, selon le métier — pas de pavé de texte.
  const ruleText = isSingleInstallment
    ? `Paiement unique, à la livraison du ${singleInstallmentDoc}.`
    : isFlexibleMinimum
      ? `Plusieurs étapes réelles, la dernière étant le ${finalDocumentLabel}. Nombre d'étapes libre.`
      : `Au moins ${MIN_INSTALLMENTS_OTHER_TRADES} étapes requises pour ce métier.`;

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="block text-sm font-medium">Échéancier de paiement</label>
        {defaultSchedule && !isSingleInstallment && (
          <button
            type="button"
            onClick={() => setRows(withDeliverable(defaultSchedule))}
            className="text-xs font-medium text-forest hover:underline"
          >
            Revenir à l'exemple
          </button>
        )}
      </div>
      <p className="mb-3 text-xs text-gray-500">{ruleText} Modifiez librement ci-dessous.</p>

      {/* Tableau : une ligne = une étape, 3 colonnes bien visibles. */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500">
              <th className="px-2 py-2">Étape</th>
              <th className="w-16 px-2 py-2">%</th>
              <th className="px-2 py-2">Livrable attendu</th>
              <th className="w-6 px-1 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="p-1.5">
                  <input
                    name="milestoneTitle"
                    value={row.title}
                    onChange={(e) => updateRow(i, "title", e.target.value)}
                    required
                    readOnly={isSingleInstallment}
                    placeholder="ex: Fondations terminées"
                    className={`w-full rounded-md border border-gray-300 p-1.5 text-sm ${isSingleInstallment ? "bg-gray-50" : ""}`}
                  />
                </td>
                <td className="p-1.5">
                  <input
                    name="milestonePercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={row.percentage}
                    onChange={(e) => updateRow(i, "percentage", e.target.value)}
                    required
                    readOnly={isSingleInstallment}
                    placeholder="%"
                    className={`w-full rounded-md border border-gray-300 p-1.5 text-sm ${isSingleInstallment ? "bg-gray-50" : ""}`}
                  />
                </td>
                <td className="p-1.5">
                  <input
                    name="milestoneDeliverable"
                    value={row.deliverable || ""}
                    onChange={(e) => updateRow(i, "deliverable", e.target.value)}
                    required
                    placeholder="ex: plan d'esquisse signé"
                    className="w-full rounded-md border border-gray-300 p-1.5 text-sm"
                  />
                </td>
                <td className="p-1.5 text-center">
                  {canRemoveRow(rows.length) && (
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      aria-label="Supprimer cette étape"
                      className="text-gray-400 hover:text-brand"
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isSingleInstallment && (
        <button type="button" onClick={addRow} className="mt-2 text-sm font-medium text-forest hover:underline">
          + Ajouter une étape
        </button>
      )}

      <p className={`mt-2 text-xs ${total === 100 ? "text-forest" : "text-brand"}`}>
        Total : {total}% {total !== 100 && ", doit être égal à 100%"}
        {!isSingleInstallment && !isFlexibleMinimum && rows.length < MIN_INSTALLMENTS_OTHER_TRADES && (
          <span className="ml-2">, minimum {MIN_INSTALLMENTS_OTHER_TRADES} étapes</span>
        )}
      </p>
    </div>
  );
}
