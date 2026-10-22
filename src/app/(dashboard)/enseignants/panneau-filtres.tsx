'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react'
import {
  GRADES,
  STATUTS_ENSEIGNANT,
  LIBELLES_STATUT_ENSEIGNANT,
} from '@/domain/enseignants/dossier'
import { LIBELLES_GRADE } from '@/domain/enseignants/grade'
import { adresseListe } from '@/domain/enseignants/recherche/versParametres'
import { lireFiltres, parametresDepuisUrl } from '@/domain/enseignants/recherche/lireFiltres'
import type { CleTri } from '@/domain/enseignants/recherche/filtres'
import type { ReferentielsFiltres } from '@/domain/enseignants/recherche/puces'
import {
  classeBoutonPrimaire,
  classeBoutonSecondaire,
  classeCarte,
  classeChamp,
} from '@/lib/ui-classes'

const OPTIONS_TRI: [CleTri, string][] = [
  ['nom', 'Trier par nom'],
  ['grade', 'Trier par grade'],
  ['statut', 'Trier par statut'],
  ['etablissement', 'Trier par établissement'],
  ['retraite', 'Trier par date de retraite'],
  ['priseService', 'Trier par date de prise de service'],
  ['naissance', 'Trier par date de naissance'],
]

type Valeurs = Record<string, string[]>

const premiere = (valeurs: Valeurs, nom: string) => valeurs[nom]?.[0] ?? ''

function Groupe({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-border bg-muted/20 flex flex-col gap-3 rounded-2xl border p-4">
      <legend className="text-foreground px-1 text-sm font-semibold">{titre}</legend>
      {children}
    </fieldset>
  )
}

function Champ({
  id,
  libelle,
  children,
}: {
  id: string
  libelle: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-muted-foreground text-xs font-medium">
        {libelle}
      </label>
      {children}
    </div>
  )
}

function CasesACocher({
  nom,
  options,
  valeurs,
}: {
  nom: string
  options: [string, string][]
  valeurs: Valeurs
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([valeur, libelle]) => (
        <label
          key={valeur}
          className="border-border bg-card has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-sm"
        >
          <input
            type="checkbox"
            name={nom}
            value={valeur}
            defaultChecked={valeurs[nom]?.includes(valeur) ?? false}
            className="accent-primary"
          />
          {libelle}
        </label>
      ))}
    </div>
  )
}

function ListeOuiNon({
  id,
  nom,
  libelle,
  valeurs,
}: {
  id: string
  nom: string
  libelle: string
  valeurs: Valeurs
}) {
  return (
    <Champ id={id} libelle={libelle}>
      <select id={id} name={nom} defaultValue={premiere(valeurs, nom)} className={classeChamp}>
        <option value="">Indifférent</option>
        <option value="oui">Oui</option>
        <option value="non">Non</option>
      </select>
    </Champ>
  )
}

/** Une année, ou une plage « du … au … » : les trois champs se combinent. */
function ChampsDate({
  prefixe,
  titre,
  valeurs,
}: {
  prefixe: string
  titre: string
  valeurs: Valeurs
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-foreground text-sm font-medium">{titre}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Champ id={`${prefixe}Annee`} libelle="Année">
          <input
            id={`${prefixe}Annee`}
            name={`${prefixe}Annee`}
            type="number"
            min={1900}
            max={2200}
            inputMode="numeric"
            placeholder="ex. 2027"
            defaultValue={premiere(valeurs, `${prefixe}Annee`)}
            className={classeChamp}
          />
        </Champ>
        <Champ id={`${prefixe}Du`} libelle="À partir du">
          <input
            id={`${prefixe}Du`}
            name={`${prefixe}Du`}
            type="date"
            defaultValue={premiere(valeurs, `${prefixe}Du`)}
            className={classeChamp}
          />
        </Champ>
        <Champ id={`${prefixe}Au`} libelle="Jusqu'au">
          <input
            id={`${prefixe}Au`}
            name={`${prefixe}Au`}
            type="date"
            defaultValue={premiere(valeurs, `${prefixe}Au`)}
            className={classeChamp}
          />
        </Champ>
      </div>
    </div>
  )
}

/**
 * Formulaire de recherche et de filtres. C'est un formulaire GET ordinaire : il fonctionne même
 * sans JavaScript. Avec JavaScript, il fabrique une adresse propre (sans paramètre vide, dans
 * l'ordre canonique) au lieu de laisser le navigateur en écrire une avec tous les champs.
 *
 * `valeurs` vient de l'adresse actuelle ; `cle` change avec elle, ce qui remet le formulaire à
 * jour après chaque navigation (retrait d'une puce, changement de page…).
 */
export function PanneauFiltres({
  valeurs,
  cle,
  referentiels,
  nombreFiltresAvances,
  ouvert,
}: {
  valeurs: Valeurs
  cle: string
  referentiels: ReferentielsFiltres
  nombreFiltresAvances: number
  ouvert: boolean
}) {
  const routeur = useRouter()
  const [enCours, demarrer] = useTransition()
  const [etablissementId, setEtablissementId] = useState(premiere(valeurs, 'etablissement'))
  const [departementId, setDepartementId] = useState(premiere(valeurs, 'departement'))
  const [regionId, setRegionId] = useState(premiere(valeurs, 'region'))
  const [origineId, setOrigineId] = useState(premiere(valeurs, 'origine'))

  const departements = referentiels.departements.filter(
    (d) => etablissementId === '' || d.etablissementId === etablissementId
  )
  const departementsOrigine = referentiels.departementsOrigine.filter(
    (d) => regionId === '' || d.regionId === regionId
  )

  function surEnvoi(evenement: React.FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    const brut = new URLSearchParams()
    for (const [nom, valeur] of new FormData(evenement.currentTarget).entries()) {
      if (typeof valeur === 'string' && valeur.trim() !== '') brut.append(nom, valeur.trim())
    }
    // Relire puis réécrire : l'adresse devient canonique et les saisies invalides disparaissent.
    const filtres = lireFiltres(parametresDepuisUrl(brut))
    demarrer(() => routeur.push(adresseListe(filtres)))
  }

  return (
    <form
      key={cle}
      method="get"
      action="/enseignants"
      onSubmit={surEnvoi}
      className={`${classeCarte} flex flex-col gap-4 p-4`}
    >
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search
            size={16}
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <input
            type="search"
            name="recherche"
            aria-label="Rechercher un enseignant"
            defaultValue={premiere(valeurs, 'recherche')}
            placeholder="Rechercher par nom, matricule, domaine..."
            className={`${classeChamp} w-full pl-10`}
          />
        </div>
        <select
          name="trier"
          aria-label="Trier par"
          defaultValue={premiere(valeurs, 'trier') || 'nom'}
          className={classeChamp}
        >
          {OPTIONS_TRI.map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </select>
        <select
          name="ordre"
          aria-label="Sens du tri"
          defaultValue={premiere(valeurs, 'ordre') || 'asc'}
          className={classeChamp}
        >
          <option value="asc">Croissant</option>
          <option value="desc">Décroissant</option>
        </select>
        <button type="submit" disabled={enCours} className={classeBoutonPrimaire}>
          {enCours ? 'Recherche…' : 'Rechercher'}
        </button>
      </div>

      <details open={ouvert} className="group">
        <summary className="text-foreground hover:text-primary flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
          <SlidersHorizontal size={16} />
          Filtres avancés
          {nombreFiltresAvances > 0 && (
            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
              {nombreFiltresAvances}
            </span>
          )}
          <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
        </summary>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Groupe titre="Identité et situation">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium">Statut</span>
              <CasesACocher
                nom="statut"
                valeurs={valeurs}
                options={STATUTS_ENSEIGNANT.map((s) => [s, LIBELLES_STATUT_ENSEIGNANT[s]])}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium">Grade</span>
              <CasesACocher
                nom="grade"
                valeurs={valeurs}
                options={GRADES.map((g) => [g, LIBELLES_GRADE[g] ?? g])}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Champ id="sexe" libelle="Genre">
                <select
                  id="sexe"
                  name="sexe"
                  defaultValue={premiere(valeurs, 'sexe')}
                  className={classeChamp}
                >
                  <option value="">Indifférent</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </Champ>
              <ListeOuiNon id="resident" nom="resident" libelle="Résident" valeurs={valeurs} />
              <ListeOuiNon
                id="collaboration"
                nom="collaboration"
                libelle="Contrat de collaboration"
                valeurs={valeurs}
              />
              <ListeOuiNon
                id="responsabilite"
                nom="responsabilite"
                libelle="Poste de responsabilité"
                valeurs={valeurs}
              />
            </div>
          </Groupe>

          <Groupe titre="Affectation et origine">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Champ id="etablissement" libelle="Établissement">
                <select
                  id="etablissement"
                  name="etablissement"
                  value={etablissementId}
                  onChange={(e) => {
                    setEtablissementId(e.target.value)
                    setDepartementId('')
                  }}
                  className={classeChamp}
                >
                  <option value="">Tous</option>
                  {referentiels.etablissements.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.abreviation} — {e.nom}
                    </option>
                  ))}
                </select>
              </Champ>
              <Champ id="departement" libelle="Département d'affectation">
                <select
                  id="departement"
                  name="departement"
                  value={departementId}
                  onChange={(e) => setDepartementId(e.target.value)}
                  className={classeChamp}
                >
                  <option value="">Tous</option>
                  {departements.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom}
                    </option>
                  ))}
                </select>
              </Champ>
              <Champ id="region" libelle="Région d'origine">
                <select
                  id="region"
                  name="region"
                  value={regionId}
                  onChange={(e) => {
                    setRegionId(e.target.value)
                    setOrigineId('')
                  }}
                  className={classeChamp}
                >
                  <option value="">Toutes</option>
                  {referentiels.regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nom}
                    </option>
                  ))}
                </select>
              </Champ>
              <Champ id="origine" libelle="Département d'origine">
                <select
                  id="origine"
                  name="origine"
                  value={origineId}
                  onChange={(e) => setOrigineId(e.target.value)}
                  className={classeChamp}
                >
                  <option value="">Tous</option>
                  {departementsOrigine.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nom}
                    </option>
                  ))}
                </select>
              </Champ>
            </div>
          </Groupe>

          <Groupe titre="Position (classe, échelon, indice)">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Champ id="classe" libelle="Classe">
                <input
                  id="classe"
                  name="classe"
                  type="number"
                  min={1}
                  max={9}
                  inputMode="numeric"
                  defaultValue={premiere(valeurs, 'classe')}
                  className={classeChamp}
                />
              </Champ>
              <Champ id="echelon" libelle="Échelon">
                <input
                  id="echelon"
                  name="echelon"
                  type="number"
                  min={1}
                  max={9}
                  inputMode="numeric"
                  defaultValue={premiere(valeurs, 'echelon')}
                  className={classeChamp}
                />
              </Champ>
              <Champ id="indiceMin" libelle="Indice minimum">
                <input
                  id="indiceMin"
                  name="indiceMin"
                  type="number"
                  min={0}
                  max={9999}
                  inputMode="numeric"
                  defaultValue={premiere(valeurs, 'indiceMin')}
                  className={classeChamp}
                />
              </Champ>
              <Champ id="indiceMax" libelle="Indice maximum">
                <input
                  id="indiceMax"
                  name="indiceMax"
                  type="number"
                  min={0}
                  max={9999}
                  inputMode="numeric"
                  defaultValue={premiere(valeurs, 'indiceMax')}
                  className={classeChamp}
                />
              </Champ>
            </div>
          </Groupe>

          <Groupe titre="Dates">
            <ChampsDate prefixe="naissance" titre="Date de naissance" valeurs={valeurs} />
            <ChampsDate prefixe="priseService" titre="Date de prise de service" valeurs={valeurs} />
          </Groupe>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" disabled={enCours} className={classeBoutonPrimaire}>
            Appliquer les filtres
          </button>
          <Link href="/enseignants" className={classeBoutonSecondaire}>
            Réinitialiser
          </Link>
        </div>
      </details>
    </form>
  )
}
