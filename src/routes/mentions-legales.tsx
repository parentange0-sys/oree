import { createFileRoute } from "@tanstack/react-router";
import { FillIn, LegalSection, LegalShell } from "@/components/legal-shell";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales · Orée" },
      {
        name: "description",
        content:
          "Mentions légales d’Orée : éditeur à compléter, hébergeur Vercel, nature du service d’information générale.",
      },
    ],
  }),
  component: MentionsLegalesPage,
});

function MentionsLegalesPage() {
  return (
    <LegalShell title="Mentions légales">
      <p className="text-sm leading-relaxed text-muted">
        Les encadrés « À compléter » sont des emplacements vides. Ils ne désignent aucune personne
        réelle. L’éditeur les remplace avant toute ouverture au public.
      </p>
      <LegalSection title="Éditeur">
        <p>
          Orée est un outil en ligne d’information générale sur des paires spot cotées en USDT. Les
          éléments d’identification ci-dessous sont ceux exigés pour un site mis à la disposition du
          public.
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            Nom ou dénomination : <FillIn>nom et prénom, ou raison sociale</FillIn>
          </li>
          <li>
            Statut : <FillIn>personne physique, ou forme juridique et capital social</FillIn>
          </li>
          <li>
            Adresse : <FillIn>domicile ou siège, code postal, ville, pays</FillIn>
          </li>
          <li>
            Immatriculation :{" "}
            <FillIn>RCS et SIREN/SIRET si société, sinon « non applicable »</FillIn>
          </li>
          <li>
            TVA intracommunautaire : <FillIn>numéro, ou « non applicable »</FillIn>
          </li>
          <li>
            Contact : <FillIn>adresse e-mail, et téléphone si un numéro est publié</FillIn>
          </li>
          <li>
            Directeur de la publication : <FillIn>nom de la personne responsable</FillIn>
          </li>
        </ul>
      </LegalSection>
      <LegalSection title="Hébergeur">
        <p>
          L’application est prévue pour être hébergée chez Vercel. Les coordonnées exactes se
          recopient depuis le contrat ou les mentions publiées par Vercel au jour de la mise en
          ligne (
          <a
            className="text-fg underline decoration-border underline-offset-2"
            href="https://vercel.com"
            rel="noreferrer"
          >
            vercel.com
          </a>
          ).
        </p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            Raison sociale : <FillIn>entité Vercel contractante</FillIn>
          </li>
          <li>
            Adresse : <FillIn>adresse du siège de cette entité</FillIn>
          </li>
          <li>
            Contact : <FillIn>téléphone ou autre contact publié par l’hébergeur</FillIn>
          </li>
        </ul>
      </LegalSection>
      <LegalSection title="Nature du service">
        <p>
          Le même filtre automatique s’applique à toutes les personnes qui ouvrent l’outil. La paire
          affichée, la lecture (ouverte, neutre ou écartée) et les repères à −5 % et +6 % décrivent
          ce filtre. Ils ne tiennent pas compte d’une situation personnelle, d’objectifs ou d’une
          capacité à supporter des pertes.
        </p>
        <p>
          Ce n’est pas un conseil en investissement, ni une recommandation d’acheter, de vendre ou
          de conserver un crypto-actif. Orée ne reçoit pas de fonds et ne transmet aucun ordre. La
          version actuelle ne se présente pas comme un prestataire de services sur crypto-actifs.
        </p>
        <p>
          Les crypto-actifs peuvent perdre toute valeur. Les variations passées ne préjugent pas des
          variations futures.
        </p>
      </LegalSection>
      <LegalSection title="Propriété">
        <p>
          L’interface et les textes originaux relèvent de l’éditeur, sauf mention contraire. Les
          cours, articles, messages publics et signes distinctifs des crypto-actifs restent la
          propriété de leurs titulaires.
        </p>
      </LegalSection>
      <LegalSection title="Liens">
        <p>
          Cette version ne contient pas de lien d’affiliation ni de bouton vers une plateforme
          d’échange. Les articles et les messages ouvrent des sites tiers, soumis à leurs propres
          conditions.
        </p>
        <p>
          Si des liens vers des plateformes agréées au titre du règlement européen sur les marchés
          de crypto-actifs (MiCA), ou un abonnement, sont ajoutés plus tard, cette page et la page
          Confidentialité sont à mettre à jour avant publication.
        </p>
      </LegalSection>
      <LegalSection title="Mise à jour">
        <p>
          Dernière mise à jour de cette page : <FillIn>date</FillIn>
        </p>
      </LegalSection>
    </LegalShell>
  );
}
