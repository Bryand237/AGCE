'use client'

import { useState, useMemo } from 'react'
import { useActionState } from 'react'
import { creerEnseignant, modifierEnseignant, type EtatFormulaire } from './actions'
import { LIBELLES_GRADE } from '@/domain/enseignants/grade'

type Etablissement = { id: string; nom: string; abreviation: string }
type Departement = { id: string; nom: string; etablissementId: string }
type DepartementOrigine = { id: string; nom: string; region: { nom: string } }
type LigneGrille = {
  id: string
  grade: string
  voie: string | null
  libelle: string
  indice: number
}

type EnseignantExistant = {
  id: string
  matricule: string
  nom: string
  prenom: string
  sexe: 'M' | 'F'
  dateNaissance: Date
  lieuNaissance: string
  diplomePlusEleve: string | null
  domaineRecherche: string | null
  datePriseService: Date
  estResident: boolean
  contratCollaboration: boolean
  posteResponsabilite: string | null
  telephone: string | null
  email: string | null
  departementId: string
  departementOrigineId: string | null
  positionActuelleId: string
  dateEffetEchelon: Date
  grade: string
  departement: { etablissementId: string }
  positionActuelle: { voie: string | null }
}

const etatInitial: EtatFormulaire = {}
const classeChamp =
  'rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/15 focus:outline-none'

function formatDateInput(d: Date) {
  return d.toISOString().slice(0, 10)
}

function SectionFormulaire({
  titre,
  children,
}: {
  titre: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/20 p-5">
      <legend className="px-1 text-sm font-semibold text-foreground">{titre}</legend>
      {children}
    </fieldset>
  )
}

export function FormulaireEnseignant({
  mode,
  enseignant,
  etablissements,
  departements,
  departementsOrigine,
  grille,
}: {
  mode: 'creer' | 'modifier'
  enseignant?: EnseignantExistant
  etablissements: Etablissement[]
  departements: Departement[]
  departementsOrigine: DepartementOrigine[]
  grille: LigneGrille[]
}) {
  const actionServeur =
    mode === 'creer'
      ? creerEnseignant
      : modifierEnseignant.bind(null, enseignant!.id)

  const [state, formAction, isPending] = useActionState(actionServeur, etatInitial)
  const [etablissementId, setEtablissementId] = useState(
    enseignant?.departement.etablissementId ?? ''
  )
  const [grade, setGrade] = useState(enseignant?.grade ?? '')
  const [voie, setVoie] = useState(enseignant?.positionActuelle.voie ?? '')

  const besoinDeVoie = grade === 'ASSISTANT'

  const departementsFiltres = useMemo(
    () => departements.filter((d) => d.etablissementId === etablissementId),
    [departements, etablissementId]
  )

  const grilleFiltree = useMemo(
    () => grille.filter((l) => l.grade === grade && (besoinDeVoie ? l.voie === voie : true)),
    [grille, grade, voie, besoinDeVoie]
  )

  const departementsOrigineParRegion = useMemo(() => {
    const map = new Map<string, DepartementOrigine[]>()
    for (const d of departementsOrigine) {
      const region = d.region.nom
      if (!map.has(region)) map.set(region, [])
      map.get(region)!.push(d)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr'))
  }, [departementsOrigine])

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      <SectionFormulaire titre="Identité">
      <label className="flex flex-col gap-1 text-sm">
        Matricule
        <input
          name="matricule"
          required
          defaultValue={enseignant?.matricule}
          className={classeChamp}
        />
        {state.errors?.matricule && (
          <p className="text-destructive text-sm">{state.errors.matricule[0]}</p>
        )}
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Nom
          <input name="nom" required defaultValue={enseignant?.nom} className={classeChamp} />
          {state.errors?.nom && <p className="text-destructive text-sm">{state.errors.nom[0]}</p>}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Prénom
          <input
            name="prenom"
            required
            defaultValue={enseignant?.prenom}
            className={classeChamp}
          />
          {state.errors?.prenom && (
            <p className="text-destructive text-sm">{state.errors.prenom[0]}</p>
          )}
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Sexe
        <select
          name="sexe"
          required
          defaultValue={enseignant?.sexe ?? ''}
          className={classeChamp}
        >
          <option value="">Choisir</option>
          <option value="M">Masculin</option>
          <option value="F">Féminin</option>
        </select>
        {state.errors?.sexe && <p className="text-destructive text-sm">{state.errors.sexe[0]}</p>}
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Date de naissance
          <input
            type="date"
            name="dateNaissance"
            required
            defaultValue={enseignant ? formatDateInput(enseignant.dateNaissance) : undefined}
            className={classeChamp}
          />
          {state.errors?.dateNaissance && (
            <p className="text-destructive text-sm">{state.errors.dateNaissance[0]}</p>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Lieu de naissance
          <input
            name="lieuNaissance"
            required
            defaultValue={enseignant?.lieuNaissance}
            className={classeChamp}
          />
          {state.errors?.lieuNaissance && (
            <p className="text-destructive text-sm">{state.errors.lieuNaissance[0]}</p>
          )}
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Département d&apos;origine
        <select
          name="departementOrigineId"
          defaultValue={enseignant?.departementOrigineId ?? ''}
          className={classeChamp}
        >
          <option value="">Non renseigné</option>
          {departementsOrigineParRegion.map(([region, deps]) => (
            <optgroup key={region} label={region}>
              {deps.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nom}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      </SectionFormulaire>

      <SectionFormulaire titre="Parcours">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Diplôme le plus élevé
          <input
            name="diplomePlusEleve"
            defaultValue={enseignant?.diplomePlusEleve ?? ''}
            className={classeChamp}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Domaine de recherche
          <input
            name="domaineRecherche"
            defaultValue={enseignant?.domaineRecherche ?? ''}
            className={classeChamp}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Date de prise de service
        <input
          type="date"
          name="datePriseService"
          required
          defaultValue={enseignant ? formatDateInput(enseignant.datePriseService) : undefined}
          className={classeChamp}
        />
        {state.errors?.datePriseService && (
          <p className="text-destructive text-sm">{state.errors.datePriseService[0]}</p>
        )}
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Résident
          <select
            name="estResident"
            required
            defaultValue={enseignant ? (enseignant.estResident ? 'oui' : 'non') : 'oui'}
            className={classeChamp}
          >
            <option value="oui">Oui</option>
            <option value="non">Non</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Contrat de collaboration
          <select
            name="contratCollaboration"
            required
            defaultValue={
              enseignant ? (enseignant.contratCollaboration ? 'oui' : 'non') : 'non'
            }
            className={classeChamp}
          >
            <option value="non">Non</option>
            <option value="oui">Oui</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Poste de responsabilité
        <input
          name="posteResponsabilite"
          defaultValue={enseignant?.posteResponsabilite ?? ''}
          className={classeChamp}
        />
      </label>
      </SectionFormulaire>

      <SectionFormulaire titre="Contact">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Téléphone
          <input
            name="telephone"
            type="tel"
            defaultValue={enseignant?.telephone ?? ''}
            className={classeChamp}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Courriel
          <input
            name="email"
            type="email"
            defaultValue={enseignant?.email ?? ''}
            className={classeChamp}
          />
          {state.errors?.email && (
            <p className="text-destructive text-sm">{state.errors.email[0]}</p>
          )}
        </label>
      </div>
      </SectionFormulaire>

      <SectionFormulaire titre="Affectation et position sur la grille">
      <label className="flex flex-col gap-1 text-sm">
        Établissement
        <select
          id="etablissement"
          value={etablissementId}
          onChange={(e) => setEtablissementId(e.target.value)}
          className={classeChamp}
        >
          <option value="">Choisir un établissement</option>
          {etablissements.map((e) => (
            <option key={e.id} value={e.id}>
              {e.abreviation} — {e.nom}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Département
        <select
          id="departementId"
          name="departementId"
          key={etablissementId}
          disabled={!etablissementId}
          required
          defaultValue={enseignant?.departementId ?? ''}
          className={classeChamp}
        >
          <option value="">
            {etablissementId ? 'Choisir un département' : "Choisir d'abord un établissement"}
          </option>
          {departementsFiltres.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nom}
            </option>
          ))}
        </select>
        {state.errors?.departementId && (
          <p className="text-destructive text-sm">{state.errors.departementId[0]}</p>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Grade
        <select
          id="grade"
          value={grade}
          onChange={(e) => {
            setGrade(e.target.value)
            setVoie('')
          }}
          className={classeChamp}
        >
          <option value="">Choisir un grade</option>
          {Object.entries(LIBELLES_GRADE).map(([valeur, libelle]) => (
            <option key={valeur} value={valeur}>
              {libelle}
            </option>
          ))}
        </select>
      </label>

      {besoinDeVoie && (
        <label className="flex flex-col gap-1 text-sm">
          Voie
          <select
            id="voie"
            value={voie}
            onChange={(e) => setVoie(e.target.value)}
            className={classeChamp}
          >
            <option value="">Choisir une voie</option>
            <option value="SANS_THESE">Sans thèse</option>
            <option value="AVEC_THESE">Avec thèse</option>
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Position sur la grille indiciaire
        <select
          id="positionActuelleId"
          name="positionActuelleId"
          key={`${grade}-${voie}`}
          disabled={!grade || (besoinDeVoie && !voie)}
          required
          defaultValue={enseignant?.positionActuelleId ?? ''}
          className={classeChamp}
        >
          <option value="">
            {!grade
              ? "Choisir d'abord un grade"
              : besoinDeVoie && !voie
                ? "Choisir d'abord une voie"
                : 'Choisir la position'}
          </option>
          {grilleFiltree.map((l) => (
            <option key={l.id} value={l.id}>
              {l.libelle} — indice {l.indice}
            </option>
          ))}
        </select>
        {state.errors?.positionActuelleId && (
          <p className="text-destructive text-sm">{state.errors.positionActuelleId[0]}</p>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Date d&apos;effet de l&apos;échelon
        <input
          type="date"
          name="dateEffetEchelon"
          required
          defaultValue={enseignant ? formatDateInput(enseignant.dateEffetEchelon) : undefined}
          className={classeChamp}
        />
        {state.errors?.dateEffetEchelon && (
          <p className="text-destructive text-sm">{state.errors.dateEffetEchelon[0]}</p>
        )}
      </label>
      </SectionFormulaire>

      {state.message && <p className="text-destructive text-sm">{state.message}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-2xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"
      >
        {isPending
          ? 'Enregistrement...'
          : mode === 'creer'
            ? "Enregistrer l'enseignant"
            : 'Enregistrer les modifications'}
      </button>
    </form>
  )
}
