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

  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        Échéancier de paiement
      </label>

      {isSingleInstallment ? (
        <p className="mb-3 rounded-lg bg-brand-light p-3 text-xs text-brand-dark">
          La main d'œuvre de ce professionnel se paie en <strong>une seule fois</strong>, uniquement à la livraison du {singleInstallmentDoc} sur la plateforme, l'artisan doit envoyer le document pour débloquer le virement. Les frais administratifs du dossier, eux, se règlent séparément au fur et à mesure de l'avancement réel des démarches.
        </p>
      ) : (
        <>
          <p className="mb-3 rounded-lg bg-brand-light p-3 text-xs text-brand-dark">
            {isFlexibleMinimum ? (
              <>
                Pour ce métier, l'échéancier comporte <strong>plusieurs étapes bien réelles</strong> (pas un paiement unique) — la dernière étant la livraison du {finalDocumentLabel}, vérifiée automatiquement avant de débloquer son paiement. Le nombre de versements (1, 2, 3...) et leur répartition se négocient librement avec le professionnel, il n'y a pas de minimum imposé.
              </>
            ) : (
              <>
                Pour ce métier, vous devez prévoir <strong>au moins {MIN_INSTALLMENTS_OTHER_TRADES} étapes</strong>, un échéancier de paiement en plusieurs étapes est requis. Discutez de ce découpage avec l'artisan avant de valider.
              </>
            )}
          </p>

          <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
            {defaultSchedule ? (
              <>
                <p className="font-semibold text-ink">
                  Les étapes pré-remplies ci-dessous sont un point de départ pour ce métier — modifiez les titres, les pourcentages, ajoutez ou supprimez une ligne selon les vraies étapes de ce projet précis.
                </p>
                <button
                  type="button"
                  onClick={() => setRows(defaultSchedule.map((r) => ({ ...r })))}
                  className="mt-2 font-medium text-forest hover:underline"
                >
                  Revenir aux étapes suggérées
                </button>
              </>
            ) : (
              <p>Découpe l'échéancier selon les vraies étapes de <strong>ce métier précis</strong>, ne mélange pas avec le travail d'un autre artisan du projet.</p>
            )}
            <p className="mt-2 font-semibold text-ink">Autre façon de faire :</p>
            <p className="mt-1">Un paiement régulier (chaque semaine ou chaque mois) selon les jours réellement travaillés par l'artisan, à adapter avec lui selon la durée prévue du chantier.</p>
          </div>
        </>
      )}

      <p className="mb-1 text-xs font-semibold text-gray-500">
        Pour chaque étape, précisez le <strong>livrable attendu</strong> (le document/preuve à envoyer sur la
        plateforme) : c'est ce qui débloquera le paiement du client, et ce qui vous permettra ensuite de valider
        l'étape.
      </p>
      <div className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-lg border border-gray-100 p-2">
            <div className="flex gap-2">
              <input
                name="milestoneTitle"
                value={row.title}
                onChange={(e) => updateRow(i, "title", e.target.value)}
                required
                readOnly={isSingleInstallment}
                placeholder="ex: Fondations terminées"
                className={`flex-1 rounded-lg border border-gray-300 p-2 text-sm ${isSingleInstallment ? "bg-gray-50" : ""}`}
              />
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
                className={`w-20 rounded-lg border border-gray-300 p-2 text-sm ${isSingleInstallment ? "bg-gray-50" : ""}`}
              />
              {canRemoveRow(rows.length) && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  aria-label="Supprimer cette étape"
                  className="px-2 text-gray-400 hover:text-brand"
                >
                  ✕
                </button>
              )}
            </div>
            <input
              name="milestoneDeliverable"
              value={row.deliverable || ""}
              onChange={(e) => updateRow(i, "deliverable", e.target.value)}
              required
              placeholder="Livrable attendu à cette étape (ex: plan d'esquisse signé, photos du coffrage...)"
              className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs"
            />
          </div>
        ))}
      </div>

      {!isSingleInstallment && (
        <button
          type="button"
          onClick={addRow}
          className="mt-2 text-sm font-medium text-forest hover:underline"
        >
          + Ajouter une étape
        </button>
      )}

      <p className={`mt-2 text-xs ${total === 100 ? "text-forest" : "text-brand"}`}>
        Total : {total}% {total !== 100 && ", doit être égal à 100% pour valider"}
        {!isSingleInstallment && !isFlexibleMinimum && rows.length < MIN_INSTALLMENTS_OTHER_TRADES && (
          <span className="ml-2">, minimum {MIN_INSTALLMENTS_OTHER_TRADES} étapes requises</span>
        )}
      </p>
    </div>
  );
}
