# Maintainer runbook

This project was built to be handed over. It has no database, no paid service,
no shared credential and no review queue. If you have just inherited it, this
page is everything you need.

## Handover in three steps

1. **Transfer the repository.** GitHub Settings → General → Danger Zone →
   Transfer ownership. Discussions, Actions, labels, issues, every listing and
   the whole history move with it. This is the only asset that matters.
2. **Re-link a deployment.** Import the repository into Vercel (or Cloudflare
   Pages, or Netlify) and set the environment variables from `.env.example`.
   Takes a few minutes. The old deployment can be deleted.
3. **Re-issue the GitHub OAuth App.** The old owner's app cannot be transferred.
   Create a new one under the new owner and update `GITHUB_CLIENT_ID` /
   `GITHUB_CLIENT_SECRET`. Until you do, browsing works but publishing does not.

If the repository name or owner changes, set `NEXT_PUBLIC_REPO_OWNER` and
`NEXT_PUBLIC_REPO_NAME` to match, and update `NEXT_PUBLIC_GISCUS_REPO`.

## First-time setup checklist

- [ ] Repository is **public** — forks, giscus and free Actions all depend on it
- [ ] Discussions enabled (comments default to the **General** category, which
      GitHub creates for you; categories cannot be made via the API, so a
      dedicated "Listings" category is optional polish — create it in the UI and
      update `NEXT_PUBLIC_GISCUS_CATEGORY` / `_CATEGORY_ID` if you want one)
- [ ] The [giscus GitHub App](https://github.com/apps/giscus) is installed on the
      repository — without it the comment box loads but cannot post
- [ ] `needs-review` label exists — CI applies it to submissions that fail
- [ ] giscus IDs generated at <https://giscus.app> and set in the deployment
- [ ] `GITHUB_TOKEN` set on the build, so `/forum` and download counts populate
- [ ] Optionally, a Vercel Deploy Hook stored as the repository variable
      `VERCEL_DEPLOY_HOOK`, used by the nightly stats job

## What runs on its own

| When | What | Where |
| --- | --- | --- |
| Every pull request | Validate the listing; auto-merge if it passes | `validate-listing.yml` |
| 04:17 UTC daily | Refresh download counts and reaction totals, commit, rebuild | `refresh-stats.yml` |
| Every push to `main` | Rebuild and redeploy the site | Vercel's GitHub integration |

Nothing else needs a human. A submission that passes validation is published
without anyone looking at it — that is intentional, and the validation is what
makes it safe.

## The one file to be careful with

`.github/workflows/validate-listing.yml` runs on `pull_request_target`, which
means it executes with **write access to this repository** while handling a pull
request from a stranger. It is safe only because it treats fork content strictly
as data: it never checks out fork code into a step that runs, and it installs
dependencies from the base branch's lockfile before any fork content exists on
disk.

If you change that file, keep the invariant. Running so much as an `npm install`
against a fork's `package.json` would let any contributor execute code with your
repository's token, which is a full takeover.

Actions are pinned to commit SHAs rather than tags for the same reason — a tag
can be moved, a SHA cannot.

## Common situations

**A listing needs removing.** Delete `listings/<slug>/` on `main` and push. The
site rebuilds without it. Git history keeps the record.

**Someone published something abusive.** Delete the folder as above, then use
GitHub's own tooling on the account. You do not have a separate user database to
clean up, because there isn't one.

**A contributor cannot edit their own listing.** Check `authorGithub` in their
`listing.json` matches their GitHub login exactly. That field is the ownership
key; CI compares it against the pull request author.

**Someone should take over a listing.** Ownership transfer is deliberately not
self-service. Edit `authorGithub` on `main` yourself, after confirming both
parties agree.

**The nightly stats job fails.** It is non-critical. Download counts and
reaction totals simply stay at their last known values — the code never
overwrites good data with zeroes on failure.

**Screenshots are bloating the repository.** CI caps each image at 500 KB and
each listing at 3 MB. If it still grows uncomfortably, move media to release
assets; `listing.json` needs no schema change, only the `media` paths do.

## Costs

Zero, on public repositories:

- GitHub Actions: free for public repos
- GitHub Discussions, Issues, Releases: free, no storage cap that matters here
- giscus: free and open source
- Vercel Hobby: free — but see the caveat below

**The one thing that can start costing money.** Vercel's Hobby plan is
non-commercial only, and Vercel reads that broadly. A catalogue of free scripts
is fine. Once authors add paid or donation links, move to Vercel Pro or to
Cloudflare Pages, whose free tier permits commercial use. Nothing in the code
needs to change — the site is a static build with a handful of Node routes.
