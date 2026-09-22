// Icônes en ligne, dessinées pour coller au sujet (chantier, plans,
// mesures) plutôt que des pictos génériques de type SaaS.

const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };

export function IconSearch(props) {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" {...base} {...props}>
      <circle cx="14" cy="14" r="8" />
      <path d="M20 20l7 7" />
    </svg>
  );
}

export function IconChat(props) {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" {...base} {...props}>
      <path d="M6 8h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H14l-5 5v-5H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" />
      <path d="M11 13h8M11 17h5" />
    </svg>
  );
}

export function IconContract(props) {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" {...base} {...props}>
      <path d="M9 4h11l5 5v19a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
      <path d="M20 4v5h5" />
      <path d="M12 17l3 3 6-7" />
    </svg>
  );
}

export function IconLayers(props) {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" {...base} {...props}>
      <path d="M16 5l12 6-12 6L4 11l12-6Z" />
      <path d="M4 17l12 6 12-6" />
      <path d="M4 23l12 6 12-6" />
    </svg>
  );
}

export function IconGauge(props) {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" {...base} {...props}>
      <path d="M6 22a10 10 0 1 1 20 0" />
      <path d="M16 22l6-8" />
      <circle cx="16" cy="22" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Boussole / théodolite — géomètre-topographe
export function IconCompass(props) {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26" {...base} {...props}>
      <circle cx="16" cy="16" r="12" />
      <path d="M20.5 11.5L14 14l-2.5 6.5L18 18l2.5-6.5Z" />
      <circle cx="16" cy="16" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Équerre + plan — architecte
export function IconBlueprint(props) {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26" {...base} {...props}>
      <path d="M5 27V9l9-4 13 6v16" />
      <path d="M5 27h22" />
      <path d="M9 27V13l9-4" />
      <path d="M14 27v-7h6v7" />
    </svg>
  );
}

// Casque de chantier — technicien BTP
export function IconHelmet(props) {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26" {...base} {...props}>
      <path d="M5 22a11 11 0 0 1 22 0Z" />
      <path d="M2 22h28" />
      <path d="M16 6v5" />
    </svg>
  );
}

// Truelle — maçon / autres corps de métier
export function IconTrowel(props) {
  return (
    <svg viewBox="0 0 32 32" width="26" height="26" {...base} {...props}>
      <path d="M8 24l12-12 4 4-12 12-4-4Z" />
      <path d="M20 8l4 4" />
      <path d="M22 6l4 4-2 2-4-4 2-2Z" />
    </svg>
  );
}

export function IconShieldCheck(props) {
  return (
    <svg viewBox="0 0 32 32" width="24" height="24" {...base} {...props}>
      <path d="M16 4l11 4v9c0 7-4.7 11.6-11 13-6.3-1.4-11-6-11-13V8Z" />
      <path d="M11 16l4 4 7-8" />
    </svg>
  );
}

export function IconFolder(props) {
  return (
    <svg viewBox="0 0 32 32" width="24" height="24" {...base} {...props}>
      <path d="M4 9a2 2 0 0 1 2-2h6l3 3h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9Z" />
    </svg>
  );
}

export function IconMilestones(props) {
  return (
    <svg viewBox="0 0 32 32" width="24" height="24" {...base} {...props}>
      <path d="M5 27V5" />
      <path d="M5 7h13l-3 4 3 4H5" />
    </svg>
  );
}

export function IconSignal(props) {
  return (
    <svg viewBox="0 0 32 32" width="24" height="24" {...base} {...props}>
      <path d="M9 23a10 10 0 0 1 14 0" />
      <path d="M13 19a5 5 0 0 1 6 0" />
      <circle cx="16" cy="24" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconHandshake(props) {
  return (
    <svg viewBox="0 0 32 32" width="24" height="24" {...base} {...props}>
      <path d="M3 16l6-6 4 3 4-3 6 6" />
      <path d="M9 13l6 6" />
      <path d="M17 19l3 3" />
      <path d="M3 16l4 4a2 2 0 0 0 3 0" />
      <path d="M29 16l-4 4a2 2 0 0 1-3 0" />
    </svg>
  );
}
