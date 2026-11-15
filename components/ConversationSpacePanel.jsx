"use client";

import { useState } from "react";
import { addConversationParticipant, startVideoCall, scheduleVideoMeeting } from "@/app/messages/actions";

// Le haut de l'espace : qui est là (avec un + direct pour ajouter un
// professionnel du projet qui n'y est pas encore, ou un 📞 pour afficher
// son contact s'il y est déjà), puis trois grosses actions — converser,
// prendre rendez-vous en visio, appeler en visio — qui concernent tout
// le monde présent dans l'espace, pas juste une personne.
export default function ConversationSpacePanel({ conversationId, professionals }) {
  const [revealedId, setRevealedId] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);

  return (
    <div className="mb-4 flex flex-col gap-4">
      {professionals.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {professionals.map((p) => (
            <div key={p.id} className="flex w-20 flex-col items-center gap-1">
              <div className="relative">
                {p.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-400">
                    {p.name?.slice(0, 2).toUpperCase()}
                  </div>
                )}
                {p.inConversation ? (
                  <button
                    type="button"
                    onClick={() => setRevealedId(revealedId === p.id ? null : p.id)}
                    title="Afficher le contact"
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm shadow"
                  >
                    📞
                  </button>
                ) : (
                  <form action={addConversationParticipant} className="absolute -bottom-1 -right-1">
                    <input type="hidden" name="conversationId" value={conversationId} />
                    <input type="hidden" name="userId" value={p.id} />
                    <button
                      type="submit"
                      title={`Ajouter ${p.name || "ce professionnel"}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-base font-bold text-white shadow"
                    >
                      +
                    </button>
                  </form>
                )}
              </div>
              <p className="w-full truncate text-center text-[11px] font-semibold leading-tight text-ink">{p.name}</p>
              <p className="w-full truncate text-center text-[10px] text-gray-400">{p.trade}</p>
              {revealedId === p.id && (
                p.phone ? (
                  <a href={`tel:${p.phone}`} className="text-[11px] font-bold text-brand underline">
                    {p.phone}
                  </a>
                ) : (
                  <span className="text-[10px] text-gray-400">Pas de numéro</span>
                )
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => document.getElementById("conversation-message-input")?.focus()}
          className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-gray-50 py-3 hover:bg-gray-100"
        >
          <span className="text-2xl" aria-hidden>💬</span>
          <span className="text-xs font-semibold text-ink">Converser</span>
        </button>
        <button
          type="button"
          onClick={() => setShowSchedule((s) => !s)}
          className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-gray-50 py-3 hover:bg-gray-100"
        >
          <span className="text-2xl" aria-hidden>📅</span>
          <span className="text-xs font-semibold text-ink">Rendez-vous</span>
        </button>
        <form action={startVideoCall} className="flex-1">
          <input type="hidden" name="conversationId" value={conversationId} />
          <button type="submit" className="flex w-full flex-col items-center gap-1 rounded-xl bg-gray-50 py-3 hover:bg-gray-100">
            <span className="text-2xl" aria-hidden>📹</span>
            <span className="text-xs font-semibold text-ink">Appel vidéo</span>
          </button>
        </form>
      </div>

      {showSchedule && (
        <form action={scheduleVideoMeeting} className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
          <input type="hidden" name="conversationId" value={conversationId} />
          <input
            type="datetime-local"
            name="scheduledAt"
            required
            className="flex-1 rounded-lg border border-gray-300 p-2 text-sm"
          />
          <button type="submit" className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-dark">
            Inviter
          </button>
        </form>
      )}
    </div>
  );
}
