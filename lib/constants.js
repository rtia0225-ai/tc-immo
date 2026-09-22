// Listes fixes utilisées dans les menus déroulants du site — jamais de
// saisie libre pour ces champs, afin de garder des données cohérentes et
// filtrables (recherche, mobilité, services).

export const COUNTRIES = [
  "Côte d'Ivoire",
  "Afghanistan", "Afrique du Sud", "Albanie", "Algérie", "Allemagne", "Andorre", "Angola",
  "Antigua-et-Barbuda", "Arabie saoudite", "Argentine", "Arménie", "Australie", "Autriche",
  "Azerbaïdjan", "Bahamas", "Bahreïn", "Bangladesh", "Barbade", "Belgique", "Belize", "Bénin",
  "Bhoutan", "Biélorussie", "Birmanie", "Bolivie", "Bosnie-Herzégovine", "Botswana", "Brésil",
  "Brunei", "Bulgarie", "Burkina Faso", "Burundi", "Cambodge", "Cameroun", "Canada",
  "Cap-Vert", "Chili", "Chine", "Chypre", "Colombie", "Comores", "Congo", "Congo (RDC)",
  "Corée du Nord", "Corée du Sud", "Costa Rica", "Croatie", "Cuba", "Danemark", "Djibouti",
  "Dominique", "Égypte", "Émirats arabes unis", "Équateur", "Érythrée", "Espagne", "Estonie",
  "Eswatini", "États-Unis", "Éthiopie", "Fidji", "Finlande", "France", "Gabon", "Gambie",
  "Géorgie", "Ghana", "Grèce", "Grenade", "Guatemala", "Guinée", "Guinée équatoriale",
  "Guinée-Bissau", "Guyana", "Haïti", "Honduras", "Hongrie", "Îles Marshall", "Îles Salomon",
  "Inde", "Indonésie", "Irak", "Iran", "Irlande", "Islande", "Israël", "Italie", "Jamaïque",
  "Japon", "Jordanie", "Kazakhstan", "Kenya", "Kirghizistan", "Kiribati", "Koweït", "Laos",
  "Lesotho", "Lettonie", "Liban", "Libéria", "Libye", "Liechtenstein", "Lituanie", "Luxembourg",
  "Macédoine du Nord", "Madagascar", "Malaisie", "Malawi", "Maldives", "Mali", "Malte", "Maroc",
  "Maurice", "Mauritanie", "Mexique", "Micronésie", "Moldavie", "Monaco", "Mongolie",
  "Monténégro", "Mozambique", "Namibie", "Nauru", "Népal", "Nicaragua", "Niger", "Nigeria",
  "Norvège", "Nouvelle-Zélande", "Oman", "Ouganda", "Ouzbékistan", "Pakistan", "Palaos",
  "Palestine", "Panama", "Papouasie-Nouvelle-Guinée", "Paraguay", "Pays-Bas", "Pérou",
  "Philippines", "Pologne", "Portugal", "Qatar", "République centrafricaine",
  "République dominicaine", "République tchèque", "Roumanie", "Royaume-Uni", "Russie",
  "Rwanda", "Saint-Kitts-et-Nevis", "Saint-Marin", "Saint-Vincent-et-les-Grenadines",
  "Sainte-Lucie", "Salvador", "Samoa", "Sao Tomé-et-Principe", "Sénégal", "Serbie",
  "Seychelles", "Sierra Leone", "Singapour", "Slovaquie", "Slovénie", "Somalie", "Soudan",
  "Soudan du Sud", "Sri Lanka", "Suède", "Suisse", "Suriname", "Syrie", "Tadjikistan",
  "Tanzanie", "Tchad", "Thaïlande", "Timor oriental", "Togo", "Tonga", "Trinité-et-Tobago",
  "Tunisie", "Turkménistan", "Turquie", "Tuvalu", "Ukraine", "Uruguay", "Vanuatu",
  "Vatican", "Venezuela", "Viêt Nam", "Yémen", "Zambie", "Zimbabwe",
];

export const CI_CITIES = [
  "Abidjan - Cocody",
  "Abidjan - Marcory",
  "Abidjan - Plateau",
  "Abidjan - Yopougon",
  "Abidjan - Treichville",
  "Abidjan - Koumassi",
  "Abidjan - Port-Bouët",
  "Abidjan - Attécoubé",
  "Abidjan - Adjamé",
  "Abidjan - Abobo",
  "Abidjan - Anyama",
  "Abidjan - Songon",
  "Abengourou", "Aboisso", "Adiaké", "Adzopé", "Afféry", "Agboville",
  "Agnibilékrou", "Agou", "Akoupé", "Alépé", "Anoumaba", "Arrah", "Assuéfry",
  "Ayamé", "Azaguié", "Bako", "Bangolo", "Bassawa", "Bédiala", "Béoumi",
  "Bettié", "Biankouma", "Bingerville", "Bin-Houyé", "Bloléquin", "Bocanda",
  "Bodokro", "Bondoukou", "Bongouanou", "Boniérédougou", "Bonon", "Bonoua",
  "Booko", "Borotou", "Botro", "Bouaflé", "Bouaké", "Bouna", "Boundiali",
  "Brobo", "Buyo", "Dabakala", "Dabou", "Daloa", "Danané", "Daoukro", "Diabo",
  "Dianra", "Diawala", "Didiévi", "Diégonéfla", "Dikodougou", "Dimbokro",
  "Dioulatièdougou", "Divo", "Djékanou", "Djibrosso", "Doropo", "Dualla",
  "Duékoué", "Ettrokro", "Facobly", "Ferkessédougou", "Foumbolo", "Fresco",
  "Fronan", "Gagnoa", "Gboguhé", "Gbon", "Gbonné", "Gohitafla", "Goulia",
  "Grabo", "Grand-Bassam", "Grand-Béréby", "Grand-Lahou", "Grand-Zattry",
  "Guéyo", "Guibéroua", "Guiembé", "Guintéguéla", "Guiglo", "Guitry", "Hiré",
  "Issia", "Jacqueville", "Kanakono", "Kani", "Kaniasso", "Karakoro",
  "Kasséré", "Katiola", "Kokumbo", "Kolia", "Komborodougou", "Kong",
  "Kongasso", "Koonan", "Korhogo", "Koro", "Kouassi-Datékro",
  "Kouassi-Kouassikro", "Kouibly", "Koumbala", "Kounahiri", "Koun-Fao",
  "Kouto", "Lakota", "Logoualé", "Madinani", "Maféré", "Man", "Mankono",
  "Massala", "Mayo", "M'Bahiakro", "M'Batto", "M'Bengué", "Méagui",
  "Minignan", "Morondo", "Napiéolédougou", "Nassian", "N'Djébonouan",
  "Niablé", "Niakaramandougou", "Niellé", "Niofoin", "Odienné",
  "Ouangolodougou", "Ouaninou", "Ouellé", "Oumé", "Ouragahio", "Prikro",
  "Rubino", "Saïoua", "Sakassou", "Samatiguila", "Sandégué", "Sangouiné",
  "San-Pédro", "Sarhala", "Sassandra", "Satama-Sokoro", "Satama-Sokoura",
  "Séguéla", "Séguélon", "Seydougou", "Sifié", "Sikensi", "Sinématiali",
  "Sinfra", "Sipilou", "Sirasso", "Soubré", "Taabo", "Tabou", "Tafiré",
  "Taï", "Tanda", "Téhini", "Tengréla", "Tiapoum", "Tiassalé", "Tiébissou",
  "Tiémé", "Tiémélékro", "Tié-N'Diékro", "Tiéningboué", "Tienko",
  "Tioroniaradougou", "Tortiya", "Touba", "Toulépleu", "Toumodi", "Transua",
  "Vavoua", "Worofla", "Yakassé-Attobrou", "Yamoussoukro", "Zikisso",
  "Zouan-Hounien", "Zoukougbeu", "Zuénoula",
].sort((a, b) => a.localeCompare(b, "fr"));

export const SENIOR_TRADES = ["Architecture", "Ingénieur génie civil"];

// Architecte et Topographe : le client ne définit qu'une seule échéance,
// payée en un seul virement, déclenché par l'envoi du document livré.
// Tous les autres métiers (maçonnerie en tête) : minimum 5 échéances
// obligatoires, jamais un paiement en une seule fois.
export const SINGLE_INSTALLMENT_TRADES = {
  "Architecture": "Permis de Construire",
  "Topographe": "ACD",
};
export const MIN_INSTALLMENTS_OTHER_TRADES = 5;

// Prestations précises, différentes d'un "métier" — ce ne sont pas des
// choses qu'on peut être de métier principal, mais des services précis
// qu'un professionnel peut proposer en plus de son cœur de métier.
export const SPECIALTY_SERVICES = [
  "Suivi de chantier",
  "Réalisation 3D",
  "Levé topographique / Bornage",
  "Plans d'architecte",
  "Étude de sol",
];

// Architecte, ingénieur et topographe : aucune restriction, ils peuvent
// cocher n'importe quelle prestation spécifique. Tous les autres métiers
// (technicien BTP, maçon, etc.) n'ont accès qu'au suivi de chantier —
// même logique descendante que pour les corps de métier (SENIOR_TRADES).
export const SPECIALTY_UNRESTRICTED_TRADES = ["Architecture", "Ingénieur génie civil", "Topographe"];

export const CONSTRUCTION_SERVICES = [
  "Topographe",
  "Architecture",
  "Ingénieur génie civil",
  "Géotechnicien",
  "Technicien BTP",
  "Gros-œuvre",
  "Maçonnerie",
  "Plomberie",
  "Électricité",
  "Menuiserie",
  "Peinture",
  "Carrelage",
  "Climatisation & Froid",
  "Étanchéité",
  "Charpente",
  "Soudure & Métallerie",
  "Décoration",
  "Terrassement",
  "Second-œuvre",
];

export const HOUSE_TYPES = [
  "Studio",
  "Appartement",
  "Villa",
  "Duplex",
  "Immeuble",
  "Bureau / Local commercial",
  "Autre",
];

export const RECOMMENDATION_OPTIONS = [
  { value: "top3", label: "3 recommandations de notre part" },
  { value: "all", label: "Toute la liste" },
];

export const MOBILE_MONEY_OPERATORS = [
  "Wave",
  "MTN Mobile Money",
  "Orange Money",
  "Moov Money",
];

export const ID_DOCUMENT_TYPES = [
  "Carte Nationale d'Identité (CNI)",
  "Passeport",
  "Attestation d'identité",
  "Autre",
];

export const DAYS_OF_WEEK = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
];
