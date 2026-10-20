import { createFileRoute } from "@tanstack/react-router";
import { FillIn, LegalSection, LegalShell } from "@/components/legal-shell";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Confidentialité · Orée" },
      {
        name: "description",
        content:
          "Confidentialité d’Orée : veille enregistrée dans le navigateur, sources de données appelées, droits.",
      },
    ],
  }),
  component: ConfidentialitePage,
});

function ConfidentialitePage() {
  return (
    <LegalShell title="Confidentialité">
      <p className="text-sm leading-relaxed text-muted">
        Cette page décrit ce que l’outil enregistre vraiment, et quels services sont appelés pour
        afficher des cours, des actus ou des messages. Les encadrés « À compléter » sont vides.
      </p>
      <LegalSection title="Responsable">
        <p>Le responsable du traitement est l’éditeur du site.</p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            Identité : <FillIn>la même que dans les mentions légales</FillIn>
          </li>
          <li>
            Contact vie privée : <FillIn>adresse e-mail</FillIn>
          </li>
          <li>
            Représentant dans l’Union européenne, si l’éditeur est établi hors UE :{" "}
            <FillIn>coordonnées, ou « non applicable »</FillIn>
          </li>
          <li>
            Délégué à la protection des données : <FillIn>coordonnées, ou « non désigné »</FillIn>
          </li>
        </ul>
      </LegalSection>
      <LegalSection title="Sur cet appareil">
        <p>L’écran de marché ne crée pas de compte et ne demande pas d’adresse e-mail.</p>
        <p>
          La veille de cours est enregistrée uniquement dans le navigateur, clé{" "}
          <code className="text-brass">oree-levels-v1</code> (localStorage). Elle contient le
          symbole de la paire, les deux niveaux saisis, l’état armé ou non, et, si un niveau a été
          touché, le type d’alerte, l’heure et le cours alors affiché. Ce contenu n’est pas envoyé
          au serveur d’Orée. Le supprimer se fait en effaçant les données du site dans le
          navigateur.
        </p>
        <p>
          Si les notifications du navigateur sont autorisées, ce choix reste dans le système (Safari
          ou autre). Aucun jeton d’envoi n’est transmis à un serveur : l’alerte est calculée sur
          l’appareil.
        </p>
        <p>
          Aucun cookie de mesure d’audience n’est déposé par l’écran de marché, et aucun outil
          d’analyse d’usage n’est intégré.
        </p>
        <p>
          Le dépôt logiciel contient une brique d’authentification qui n’est pas proposée dans
          l’interface actuelle. Elle ne sert pas à consulter les cours. Si elle était activée, un
          cookie de session pourrait être déposé, et un aperçu intégré pourrait stocker un jeton
          dans sessionStorage sous la clé <code className="text-brass">grok-auth.bearer-token</code>
          . Cette page serait alors à réécrire avant cette activation.
        </p>
      </LegalSection>
      <LegalSection title="Côté serveur">
        <p>
          Ouvrir Orée appelle le serveur de l’application, hébergé chez Vercel. Ce serveur redemande
          des données publiques. Il n’y joint pas de nom, ni le contenu de la veille locale. La
          paire affichée figure dans la requête.
        </p>
        <p>
          Le serveur garde en mémoire, quelques minutes au plus, les dernières réponses de marché,
          d’actus et de messages, afin de limiter les appels. Ce cache n’est pas un fichier au nom
          du visiteur.
        </p>
        <p>
          L’hébergeur peut conserver des journaux techniques usuels : adresse IP, date, adresse
          demandée, user-agent. Durée de conservation :{" "}
          <FillIn>durée prévue avec Vercel, une fois vérifiée</FillIn>. Finalité : sécurité et
          fonctionnement du service.
        </p>
      </LegalSection>
      <LegalSection title="Services appelés">
        <p>
          Le serveur contacte les hôtes suivants. Ils voient l’adresse IP du serveur. Les noms sont
          indiqués pour décrire les flux, sans lien vers une plateforme d’échange.
        </p>
        <p>
          Cours des paires spot en USDT, variation sur 24 h, écart achat / vente, chandeliers
          horaires :
        </p>
        <ul className="list-disc pl-5">
          <li>data-api.binance.vision</li>
          <li>api.binance.com, en repli</li>
        </ul>
        <p>Autres données demandées par le serveur :</p>
        <ul className="list-disc pl-5">
          <li>api.alternative.me — indice Fear &amp; Greed</li>
          <li>api.coingecko.com — recherches tendances</li>
          <li>www.coindesk.com, cointelegraph.com, decrypt.co, www.theblock.co — flux RSS</li>
          <li>news.google.com — actualités liées à la paire affichée</li>
          <li>api.bsky.app — messages publics Bluesky</li>
          <li>api.stocktwits.com — messages publics Stocktwits</li>
        </ul>
        <p>Le navigateur contacte directement :</p>
        <ul className="list-disc pl-5">
          <li>
            fonts.googleapis.com et fonts.gstatic.com — polices (Google Fonts). Google peut voir
            l’adresse IP du visiteur.
          </li>
          <li>
            assets.coincap.io — icônes de crypto-actifs. L’hébergeur du fichier peut voir l’adresse
            IP et le nom de l’icône.
          </li>
        </ul>
        <p>Aucun de ces appels n’envoie les niveaux de veille.</p>
      </LegalSection>
      <LegalSection title="Base légale">
        <p>
          Afficher l’outil demandé relève de cette demande d’utilisation (article 6, paragraphe 1,
          point b, du règlement général sur la protection des données). Les journaux techniques de
          sécurité relèvent de l’intérêt légitime à maintenir le site disponible (article 6,
          paragraphe 1, point f).
        </p>
        <p>
          Le stockage local des niveaux est nécessaire à la veille activée sur l’appareil. Il ne
          sert pas à de la publicité.
        </p>
      </LegalSection>
      <LegalSection title="Transferts hors Union européenne">
        <p>
          Plusieurs destinataires sont établis hors de l’Union européenne, notamment l’hébergeur et
          une partie des API de marché, de presse et de réseaux.
        </p>
        <p>
          Garanties de transfert :{" "}
          <FillIn>
            clauses contractuelles types, décision d’adéquation, ou autre base, après vérification
            auprès de chaque fournisseur
          </FillIn>
          . Tant que cet encadré est vide, la page n’affirme pas que ces garanties sont déjà en
          place.
        </p>
      </LegalSection>
      <LegalSection title="Durées">
        <ul className="list-disc pl-5">
          <li>
            Niveaux de veille : jusqu’à l’effacement des données du site, ou une nouvelle saisie
          </li>
          <li>Cache mémoire du serveur : quelques minutes</li>
          <li>
            Journaux d’hébergement : <FillIn>même durée que dans la section serveur</FillIn>
          </li>
        </ul>
      </LegalSection>
      <LegalSection title="Destinataires">
        <p>
          Vercel héberge l’application. Accord de traitement :{" "}
          <FillIn>confirmer l’entité et l’existence de l’accord</FillIn>.
        </p>
        <p>
          Les services listés plus haut ne reçoivent que la requête technique décrite. Orée ne vend
          pas de données et n’intègre pas de régie publicitaire. Cette version ne dépose pas de lien
          d’affiliation.
        </p>
      </LegalSection>
      <LegalSection title="Droits">
        <p>
          Accès, rectification, effacement, limitation, opposition à un traitement fondé sur
          l’intérêt légitime, et portabilité lorsque elle s’applique. Pour la veille locale, effacer
          les données du site dans le navigateur retire la clé{" "}
          <code className="text-brass">oree-levels-v1</code>.
        </p>
        <p>
          Une réclamation peut être adressée à la CNIL :{" "}
          <a
            className="underline decoration-border underline-offset-2"
            href="https://www.cnil.fr"
            rel="noreferrer"
          >
            www.cnil.fr
          </a>
          .
        </p>
        <p>
          Exercice des droits auprès de l’éditeur : <FillIn>adresse e-mail du responsable</FillIn>.
          Sans ce contact, la demande ne peut pas encore être traitée.
        </p>
      </LegalSection>
      <LegalSection title="Mineurs">
        <p>L’outil n’est pas destiné aux enfants et ne leur demande pas de compte.</p>
      </LegalSection>
      <LegalSection title="Mise à jour">
        <p>
          Dernière mise à jour : <FillIn>date</FillIn>
        </p>
        <p>
          Un abonnement ou des liens d’affiliation, s’ils sont ajoutés, seront décrits ici avant
          leur mise en ligne, y compris les nouvelles données (compte, paiement, traceurs).
        </p>
      </LegalSection>
    </LegalShell>
  );
}
