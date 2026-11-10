import { toggleMilestone, releasePayment, uploadDeliverable } from "@/app/projects/milestones-actions";
import FileInputButton from "@/components/FileInputButton";
import { SINGLE_INSTALLMENT_TRADES, FINAL_DOCUMENT_TRADES } from "@/lib/constants";

// Le schéma lui-même (les points reliés, pleins une fois l'étape
// franchie) montre déjà où en est le projet — pas besoin d'un titre en
// gros, ni d'un encadré "Étape en cours" qui répète la même chose en
// dessous. Juste les points, le texte, et l'action du moment quand il y
// en a une.
export default function ProjectTimeline({
  projectId,
  milestones,
  isArtisan,
  currency,
  trade,
}) {
  const isSingleInstallmentTrade = !!SINGLE_INSTALLMENT_TRADES[trade];
  const isFinalDocumentTrade = !!FINAL_DOCUMENT_TRADES[trade];

  if (!milestones || milestones.length === 0) {
    return <p className="text-sm text-gray-500">Aucun échéancier défini pour ce projet.</p>;
  }

  const activeMilestone = milestones.find((m) => !m.paid_at);
  const activeIsLast = activeMilestone && milestones[milestones.length - 1]?.id === activeMilestone.id;
  const requiresDeliverable = isSingleInstallmentTrade || (isFinalDocumentTrade && activeIsLast);

  return (
    <div className="overflow-x-auto pt-1">
      <div className="flex min-w-max items-start gap-0">
        {milestones.map((m, i) => {
          const isActive = activeMilestone?.id === m.id;
          return (
            <div key={m.id} className="flex items-start">
              <div className="flex w-32 flex-col items-center text-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    m.paid_at
                      ? "bg-forest text-white"
                      : m.is_completed
                        ? "bg-brand text-white"
                        : "border-2 border-dashed border-gray-300 bg-white text-gray-300"
                  }`}
                >
                  {m.paid_at ? "✓" : i + 1}
                </div>
                <p className={`mt-1.5 text-xs font-bold leading-tight ${m.is_completed ? "text-ink" : "text-gray-400"}`}>
                  {m.title}
                </p>
                {m.amount != null && (
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {m.amount.toLocaleString("fr-FR")} {currency}
                  </p>
                )}
                <p className={`mt-0.5 text-[10px] ${m.paid_at ? "text-forest" : m.is_completed ? "text-brand" : "text-gray-400"}`}>
                  {m.paid_at ? "Payé" : m.is_completed ? "Validé" : "À venir"}
                </p>

                {/* L'action du moment, directement sous l'étape concernée
                    — pas dans un encadré séparé. */}
                {isActive && isArtisan && !m.is_completed && (
                  requiresDeliverable ? (
                    <form action={uploadDeliverable} className="mt-1.5 flex flex-col items-center gap-1">
                      <input type="hidden" name="milestoneId" value={m.id} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <FileInputButton name="document" accept=".pdf,image/*" required label="Document" />
                      <button type="submit" className="text-[11px] font-bold text-brand hover:underline">
                        Envoyer et débloquer
                      </button>
                    </form>
                  ) : (
                    <form action={toggleMilestone} className="mt-1.5">
                      <input type="hidden" name="milestoneId" value={m.id} />
                      <input type="hidden" name="projectId" value={projectId} />
                      <input type="hidden" name="isCompleted" value="false" />
                      <button type="submit" className="text-[11px] font-bold text-brand hover:underline">
                        Marquer terminé
                      </button>
                    </form>
                  )
                )}
                {isActive && !isArtisan && m.is_completed && !m.paid_at && (
                  <form action={releasePayment} className="mt-1.5">
                    <input type="hidden" name="milestoneId" value={m.id} />
                    <input type="hidden" name="projectId" value={projectId} />
                    <button type="submit" className="text-[11px] font-bold text-forest hover:underline">
                      Confirmer le virement
                    </button>
                  </form>
                )}
              </div>
              {i < milestones.length - 1 && (
                <div className={`mt-[14px] h-0.5 w-8 shrink-0 ${m.paid_at ? "bg-forest" : "border-t-2 border-dashed border-gray-300"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
