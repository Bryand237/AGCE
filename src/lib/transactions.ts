/**
 * Délais des transactions interactives de Prisma (`prisma.$transaction(async (tx) => { … })`).
 *
 * Par défaut Prisma attend 2 s une connexion libre (`maxWait`) et ANNULE la transaction au bout
 * de 5 s (`timeout`), toutes requêtes comprises. La validation d'un rapport d'avancement écrit
 * plusieurs lignes par enseignant ; sur un rapport de plusieurs centaines de lignes, ou une base
 * lente à répondre (premier démarrage, disque occupé), 5 s ne suffisent pas toujours : la
 * validation échouait alors sur une page d'erreur, après avoir peut-être occupé la base pendant
 * ces 5 s.
 *
 * - `maxWait` : temps d'attente d'une connexion libre avant de renoncer à ouvrir la transaction ;
 * - `timeout` : durée maximale de la transaction ouverte ; au-delà, tout est annulé (rien n'est
 *   enregistré à moitié) et Prisma lève l'erreur P2028, que `messageErreur` (erreurs.ts) traduit.
 *
 * À passer en second argument de chaque transaction interactive des actions ; le test
 * `src/app/transactions-des-pages.test.ts` refuse une transaction qui l'oublie.
 */
export const OPTIONS_TRANSACTION = { maxWait: 5_000, timeout: 30_000 } as const
