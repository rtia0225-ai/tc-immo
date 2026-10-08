import { toggleMilestone, releasePayment, uploadDeliverable } from "@/app/projects/milestones-actions";
import FileInputButton from "@/components/FileInputButton";
import { SINGLE_INSTALLMENT_TRADES } from "@/lib/constants";

// Échéancier horizontal : chaque étape est un point relié au suivant,
// colorée selon son état (payé / validé / en attente). L'étape qui
// demande une action affiche son formulaire juste en dessous de la ligne.
export default function ProjectTimeline({
  projectId,
  milestones,
  isArtisan,
  currency,
  trade,
}) {
  const requiresDeliverable = !!SINGLE_INSTALLMENT_TRADES[trade];

  if (!milestones || milestones.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg shadow-card">
        <div className="bg-brand p-5">
          <h2 className="font-heading font-bold text-white">Échéancier de paiement</h2>
        </div>
        <p className="bg-white p-5 text-sm text-gray-500">Aucun échéancier défini pour ce projet.</p>
      </div>
    );
  }

  const activeMilestone = milestones.find((m) => !m.paid_at);

  return (
    <div className="overflow-hidden rounded-lg shadow-card">
      <div className="bg-brand p-5 pb-4">
        <h2 className="font-heading font-bold text-white">Échéancier de paiement</h2>
      </div>

      <div className="overflow-x-auto bg-white px-5 pb-4 pt-4">
        <div className="flex min-w-max items-start gap-0 pt-2">
          {milestones.map((m, i) => (
            <div key={m.id} className="flex items-start">
              <div className="flex w-32 flex-col items-center text-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${
                    m.paid_at ? "bg-forest" : m.is_completed ? "bg-brand" : "border-2 border-dashed border-gray-300 bg-white text-gray-300"
                  }`}
                >
                  {m.paid_at ? "✓" : i + 1}
                </div>
                <p className={`mt-2 text-xs font-bold leading-tight ${m.is_completed ? "text-ink" : "text-gray-400"}`}>
                  {m.title}
                </p>
                {m.amount != null && (
                  <p className="mt-0.5 text-[11px] font-semibold text-gray-600">
                    {m.amount.toLocaleString("fr-FR")} {currency}
                  </p>
                )}
                <p className={`mt-0.5 text-[10px] font-medium ${m.paid_at ? "text-forest" : m.is_completed ? "text-brand" : "text-gray-400"}`}>
                  {m.paid_at ? "Payé" : m.is_completed ? "Validé" : "À venir"}
                </p>
              </div>
              {i < milestones.length - 1 && (
                <div className={`mt-[18px] h-0.5 w-8 shrink-0 ${m.paid_at ? "bg-forest" : "border-t-2 border-dashed border-gray-300"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {activeMilestone && (
        <div className="bg-brand-light p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Étape en cours</p>
          <p className="mt-1 font-heading font-bold text-ink">{activeMilestone.title}</p>

          {isArtisan && !activeMilestone.is_completed && (
            requiresDeliverable ? (
              <form action={uploadDeliverable} className="mt-3 flex flex-col gap-2">
                <input type="hidden" name="milestoneId" value={activeMilestone.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <FileInputButton name="document" accept=".pdf,image/*" required label="Choisir le document" />
                <button type="submit" className="w-fit rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark">
                  Envoyer et débloquer le paiement
                </button>
              </form>
            ) : (
              <form action={toggleMilestone} className="mt-3">
                <input type="hidden" name="milestoneId" value={activeMilestone.id} />
                <input type="hidden" name="projectId" value={projectId} />
                <input type="hidden" name="isCompleted" value="false" />
                <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark">
                  Marquer comme terminé
                </button>
              </form>
            )
          )}

          {activeMilestone.is_completed && (
            <p className="mt-1 text-xs text-gray-500">
              Terminé par l'artisan le {new Date(activeMilestone.completed_at).toLocaleDateString("fr-FR")}
              {activeMilestone.deliverableSignedUrl && (
                <>
                  {", "}
                  <a href={activeMilestone.deliverableSignedUrl} target="_blank" rel="noreferrer" className="text-brand underline">
                    voir le document
                  </a>
                </>
              )}
            </p>
          )}

          {!isArtisan && activeMilestone.is_completed && !activeMilestone.paid_at && (
            <form action={releasePayment} className="mt-3">
              <input type="hidden" name="milestoneId" value={activeMilestone.id} />
              <input type="hidden" name="projectId" value={projectId} />
              <button type="submit" className="rounded-lg bg-forest px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-dark">
                Confirmer le virement effectué
              </button>
            </form>
          )}

          {!activeMilestone.is_completed && !isArtisan && (
            <p className="mt-2 text-xs text-gray-500">En attente de l'artisan</p>
          )}
        </div>
      )}

      <p className="bg-gray-50 p-4 text-xs text-gray-500">
        L'échéancier a été défini par le client à la création du projet, selon le contrat convenu avec l'artisan, il ne peut plus être modifié.
      </p>
    </div>
  );
}
