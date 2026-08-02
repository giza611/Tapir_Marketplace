'use client'

import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { mediaUrl } from '@/lib/media'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  LICENSES,
  LIMITS,
  LISTING_TYPES,
  LISTING_TYPE_LABELS,
  PRICING_MODELS,
  type ResolvedListing,
} from '@/lib/schema'

type VersionDraft = {
  version: string
  releasedAt: string
  changelog: string
  downloadUrl: string
  archicadVersions: string
  minTapirVersion: string
}

type Props = {
  login: string
  /** Absent when creating. */
  initial?: ResolvedListing
  today: string
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function ListingEditor({ login, initial, today }: Props) {
  const isEdit = Boolean(initial)

  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [category, setCategory] = useState<string>(initial?.category ?? CATEGORIES[0])
  const [type, setType] = useState<string>(initial?.type ?? LISTING_TYPES[0])
  const [tags, setTags] = useState(initial?.tags.join(', ') ?? '')
  const [license, setLicense] = useState<string>(initial?.license ?? 'MIT')

  const [authorName, setAuthorName] = useState(initial?.author.name ?? '')
  const [company, setCompany] = useState(initial?.author.company ?? '')
  const [email, setEmail] = useState(initial?.author.email ?? '')
  const [website, setWebsite] = useState(initial?.author.website ?? '')

  const [repositoryUrl, setRepositoryUrl] = useState(initial?.repositoryUrl ?? '')
  const [homepageUrl, setHomepageUrl] = useState(initial?.homepageUrl ?? '')
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? '')

  const [pricingModel, setPricingModel] = useState<string>(initial?.pricing.model ?? 'free')
  const [pricingUrl, setPricingUrl] = useState(initial?.pricing.url ?? '')
  const [pricingNote, setPricingNote] = useState(initial?.pricing.note ?? '')

  const [readme, setReadme] = useState(initial?.readme ?? '')

  const [versions, setVersions] = useState<VersionDraft[]>(
    initial?.versions.map((version) => ({
      version: version.version,
      releasedAt: version.releasedAt,
      changelog: version.changelog ?? '',
      downloadUrl: version.downloadUrl,
      archicadVersions: version.archicadVersions.join(', '),
      minTapirVersion: version.minTapirVersion ?? '',
    })) ?? [
      {
        version: '1.0.0',
        releasedAt: today,
        changelog: '',
        downloadUrl: '',
        archicadVersions: '28',
        minTapirVersion: '',
      },
    ],
  )

  const [keptMedia, setKeptMedia] = useState<string[]>(initial?.media ?? [])
  const [newImages, setNewImages] = useState<{ name: string; base64: string; preview: string }[]>([])

  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState<{ url: string; number: number } | null>(null)

  const effectiveSlug = slugTouched ? slug : slugify(name)

  function updateVersion(index: number, patch: Partial<VersionDraft>) {
    setVersions((current) =>
      current.map((version, position) => (position === index ? { ...version, ...patch } : version)),
    )
  }

  async function onPickImages(files: FileList | null) {
    if (!files) return
    const room = LIMITS.maxScreenshots - keptMedia.length - newImages.length
    const accepted: { name: string; base64: string; preview: string }[] = []

    for (const file of [...files].slice(0, Math.max(0, room))) {
      if (file.size > LIMITS.maxImageBytes) {
        setErrors([
          `"${file.name}" is ${Math.round(file.size / 1024)} KB. Screenshots must be under ${Math.round(
            LIMITS.maxImageBytes / 1024,
          )} KB — compress it and try again.`,
        ])
        continue
      }
      const buffer = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
      accepted.push({
        name: slugify(file.name.replace(/\.[^.]+$/, '')) + file.name.match(/\.[^.]+$/)?.[0],
        base64,
        preview: URL.createObjectURL(file),
      })
    }
    setNewImages((current) => [...current, ...accepted])
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setErrors([])
    setSuccess(null)

    const media = [...keptMedia, ...newImages.map((image) => `media/${image.name}`)]

    const listing = {
      slug: effectiveSlug,
      name: name.trim(),
      summary: summary.trim(),
      category,
      type,
      tags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      author: {
        name: authorName.trim(),
        ...(company.trim() ? { company: company.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(website.trim() ? { website: website.trim() } : {}),
      },
      authorGithub: login,
      versions: versions.map((version) => ({
        version: version.version.trim(),
        releasedAt: version.releasedAt,
        ...(version.changelog.trim() ? { changelog: version.changelog.trim() } : {}),
        downloadUrl: version.downloadUrl.trim(),
        archicadVersions: version.archicadVersions
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        ...(version.minTapirVersion.trim()
          ? { minTapirVersion: version.minTapirVersion.trim() }
          : {}),
      })),
      media,
      ...(videoUrl.trim() ? { videoUrl: videoUrl.trim() } : {}),
      ...(repositoryUrl.trim() ? { repositoryUrl: repositoryUrl.trim() } : {}),
      ...(homepageUrl.trim() ? { homepageUrl: homepageUrl.trim() } : {}),
      license,
      pricing: {
        model: pricingModel,
        ...(pricingModel !== 'free' && pricingUrl.trim() ? { url: pricingUrl.trim() } : {}),
        ...(pricingNote.trim() ? { note: pricingNote.trim() } : {}),
      },
      createdAt: initial?.createdAt ?? today,
      updatedAt: today,
    }

    const removedMedia = (initial?.media ?? []).filter((item) => !keptMedia.includes(item))

    try {
      const response = await fetch('/api/listings/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          listing,
          readme,
          images: newImages.map((image) => ({ name: image.name, base64: image.base64 })),
          removedMedia,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        setErrors(payload.details ?? [payload.error ?? 'Something went wrong.'])
      } else {
        setSuccess({ url: payload.pullRequestUrl, number: payload.pullRequestNumber })
      }
    } catch (cause) {
      setErrors([(cause as Error).message])
    } finally {
      setBusy(false)
    }
  }

  if (success) {
    return (
      <div className="border border-accent-border bg-accent-subtle p-6">
        <CheckCircle2 size={22} aria-hidden className="text-accent" />
        <h2 className="mt-3 text-lg font-semibold">Submitted</h2>
        <p className="mt-2 max-w-lg leading-relaxed text-text-muted">
          Your listing was sent as pull request #{success.number}. Automated checks are running now
          — if it passes, it merges on its own and appears on the site within a couple of minutes.
          If something needs changing, a comment will explain what.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
          >
            Back to my listings
          </Link>
          <a
            href={success.url}
            target="_blank"
            rel="noreferrer"
            className="border border-border bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:border-border-strong"
          >
            Track it on GitHub
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-9">
      {errors.length > 0 && (
        <div className="border border-border bg-danger-subtle p-4">
          <p className="flex items-center gap-2 font-medium text-danger">
            <AlertCircle size={16} aria-hidden />
            This listing is not ready yet
          </p>
          <ul className="mt-2 space-y-1 text-sm text-danger">
            {errors.map((error) => (
              <li key={error}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <Section title="The basics" hint="What it is and where it belongs.">
        <Field label="Name" required>
          <input
            required
            value={name}
            maxLength={LIMITS.nameMaxLength}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
            placeholder="Batch Layout Publisher"
          />
        </Field>

        <Field
          label="URL slug"
          required
          hint={isEdit ? 'The slug cannot change once published.' : `It will live at /scripts/${effectiveSlug || '…'}`}
        >
          <input
            required
            value={effectiveSlug}
            disabled={isEdit}
            onChange={(event) => {
              setSlugTouched(true)
              setSlug(slugify(event.target.value))
            }}
            className={inputClass}
          />
        </Field>

        <Field label="One-line summary" required hint={`${summary.length}/${LIMITS.summaryMaxLength} — shown on the card.`}>
          <input
            required
            value={summary}
            maxLength={LIMITS.summaryMaxLength}
            onChange={(event) => setSummary(event.target.value)}
            className={inputClass}
            placeholder="Publishes selected layout subsets to PDF in one pass."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" required>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={inputClass}
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Type" required>
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className={inputClass}
            >
              {LISTING_TYPES.map((value) => (
                <option key={value} value={value}>
                  {LISTING_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Tags" hint="Comma separated. These power search.">
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            className={inputClass}
            placeholder="publishing, pdf, layouts"
          />
        </Field>

        <Field label="Licence" required hint="People are running your code — say what they may do with it.">
          <select
            value={license}
            onChange={(event) => setLicense(event.target.value)}
            className={inputClass}
          >
            {LICENSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section
        title="Versions"
        hint="Downloads must be hosted on GitHub or GitLab. Add a new entry each time you release."
      >
        <div className="space-y-4">
          {versions.map((version, index) => (
            <div key={index} className="border border-border bg-surface-2 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Version {index + 1}</p>
                {versions.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setVersions((current) => current.filter((_, position) => position !== index))
                    }
                    className="flex items-center gap-1 text-xs text-text-subtle transition-colors hover:text-danger"
                  >
                    <Trash2 size={12} aria-hidden />
                    Remove
                  </button>
                )}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Version number" required>
                  <input
                    required
                    value={version.version}
                    onChange={(event) => updateVersion(index, { version: event.target.value })}
                    className={inputClass}
                    placeholder="1.0.0"
                  />
                </Field>
                <Field label="Release date" required>
                  <input
                    required
                    type="date"
                    value={version.releasedAt}
                    onChange={(event) => updateVersion(index, { releasedAt: event.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>

              <Field
                label="Download URL"
                required
                hint="Any public https link. The file is hashed and re-checked daily, so publish a new version rather than replacing a file in place. GitHub release assets also report download counts."
              >
                <input
                  required
                  type="url"
                  value={version.downloadUrl}
                  onChange={(event) => updateVersion(index, { downloadUrl: event.target.value })}
                  className={inputClass}
                  placeholder="https://github.com/you/repo/releases/download/v1.0.0/script.zip"
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Archicad versions" required hint="Comma separated, e.g. 27, 28">
                  <input
                    required
                    value={version.archicadVersions}
                    onChange={(event) =>
                      updateVersion(index, { archicadVersions: event.target.value })
                    }
                    className={inputClass}
                    placeholder="27, 28"
                  />
                </Field>
                <Field label="Minimum Tapir version" hint="Leave blank if not required.">
                  <input
                    value={version.minTapirVersion}
                    onChange={(event) =>
                      updateVersion(index, { minTapirVersion: event.target.value })
                    }
                    className={inputClass}
                    placeholder="1.1.0"
                  />
                </Field>
              </div>

              <Field label="What changed">
                <textarea
                  rows={2}
                  value={version.changelog}
                  onChange={(event) => updateVersion(index, { changelog: event.target.value })}
                  className={inputClass}
                />
              </Field>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() =>
            setVersions((current) => [
              {
                version: '',
                releasedAt: today,
                changelog: '',
                downloadUrl: '',
                archicadVersions: '28',
                minTapirVersion: '',
              },
              ...current,
            ])
          }
          className="mt-3 flex items-center gap-1.5 border border-border px-3 py-2 text-sm transition-colors hover:border-border-strong"
        >
          <Plus size={14} aria-hidden />
          Add a version
        </button>
      </Section>

      <Section title="Description" hint="Markdown. This is the main body of your listing page.">
        <textarea
          rows={12}
          value={readme}
          onChange={(event) => setReadme(event.target.value)}
          className={`${inputClass} font-mono text-[13px]`}
          placeholder={'## What it does\n\n…\n\n## Requirements\n\n- Archicad 28\n- Tapir Add-On 1.1.0+'}
        />
      </Section>

      <Section
        title="Screenshots"
        hint={`Up to ${LIMITS.maxScreenshots}, each under ${Math.round(LIMITS.maxImageBytes / 1024)} KB. They live in the repository, so keep them lean.`}
      >
        {(keptMedia.length > 0 || newImages.length > 0) && (
          <div className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {keptMedia.map((item) => (
              <Thumb
                key={item}
                src={initial ? mediaUrl(initial.slug, item) : item}
                onRemove={() => setKeptMedia((current) => current.filter((m) => m !== item))}
              />
            ))}
            {newImages.map((image) => (
              <Thumb
                key={image.name}
                src={image.preview}
                onRemove={() =>
                  setNewImages((current) => current.filter((i) => i.name !== image.name))
                }
              />
            ))}
          </div>
        )}

        <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-border bg-surface-2 px-4 py-8 text-sm text-text-muted transition-colors hover:border-border-strong">
          <Upload size={15} aria-hidden />
          Choose images
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            className="sr-only"
            onChange={(event) => onPickImages(event.target.files)}
          />
        </label>
      </Section>

      <Section title="About you" hint="Shown on the listing so people know whose work this is.">
        <Field label="Your name or studio" required>
          <input
            required
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company">
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Email" hint="Optional and public.">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Website">
            <input
              type="url"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              className={inputClass}
              placeholder="https://"
            />
          </Field>
          <Field label="Source repository">
            <input
              type="url"
              value={repositoryUrl}
              onChange={(event) => setRepositoryUrl(event.target.value)}
              className={inputClass}
              placeholder="https://github.com/…"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Documentation or homepage">
            <input
              type="url"
              value={homepageUrl}
              onChange={(event) => setHomepageUrl(event.target.value)}
              className={inputClass}
              placeholder="https://"
            />
          </Field>
          <Field label="Video" hint="YouTube or Vimeo.">
            <input
              type="url"
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              className={inputClass}
              placeholder="https://youtu.be/…"
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Pricing"
        hint="The marketplace never handles money. If you charge or accept contributions, link to your own page and people pay you directly."
      >
        <Field label="Model" required>
          <select
            value={pricingModel}
            onChange={(event) => setPricingModel(event.target.value)}
            className={inputClass}
          >
            {PRICING_MODELS.map((value) => (
              <option key={value} value={value}>
                {value === 'free' ? 'Free' : value === 'donation' ? 'Free, accepts contributions' : 'Paid'}
              </option>
            ))}
          </select>
        </Field>

        {pricingModel !== 'free' && (
          <Field
            label="Your payment link"
            required
            hint="Ko-fi, GitHub Sponsors, PayPal, Gumroad, a Stripe payment link — anything you control."
          >
            <input
              required
              type="url"
              value={pricingUrl}
              onChange={(event) => setPricingUrl(event.target.value)}
              className={inputClass}
              placeholder="https://ko-fi.com/…"
            />
          </Field>
        )}

        <Field label="Note">
          <input
            value={pricingNote}
            onChange={(event) => setPricingNote(event.target.value)}
            className={inputClass}
            placeholder="Free for personal use."
          />
        </Field>
      </Section>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 bg-accent px-5 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {busy && <Loader2 size={15} aria-hidden className="animate-spin" />}
          {busy ? 'Submitting…' : isEdit ? 'Submit changes' : 'Publish listing'}
        </button>
        <Link
          href="/dashboard"
          className="border border-border px-4 py-2.5 text-sm transition-colors hover:border-border-strong"
        >
          Cancel
        </Link>
        <p className="text-xs text-text-subtle">
          Submitting opens a pull request from your GitHub account.
        </p>
      </div>
    </form>
  )
}

const inputClass =
  'w-full border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-subtle focus:border-accent focus:outline-none disabled:opacity-60'

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {hint && <p className="mt-1 text-sm leading-relaxed text-text-muted">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-text-subtle">{hint}</span>}
    </label>
  )
}

function Thumb({ src, onRemove }: { src: string; onRemove: () => void }) {
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element -- object URLs and local files */}
      <img src={src} alt="" className="aspect-[4/3] w-full border border-border object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove screenshot"
        className="absolute -right-2 -top-2 rounded-full border border-border bg-surface p-1 shadow-sm transition-colors hover:text-danger"
      >
        <X size={12} aria-hidden />
      </button>
    </div>
  )
}
