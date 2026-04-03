# Branch protection (GitHub repository settings)

GitHub branch protection is not representable as code in the repo; enable it in the UI (or via GitHub API / Terraform in larger orgs).

## Recommended settings for `main`

1. Open **Settings → Branches → Add branch protection rule** (or **Rulesets** if your org uses rulesets).
2. Branch name pattern: `main` (and `master` if still in use).
3. Enable:
   - **Require a pull request before merging** (optional: required approvals).
   - **Require status checks to pass before merging** — add the jobs from `.github/workflows/ci.yml`, for example:
     - `Backend (pytest)`
     - `Frontend (vitest + build)`
     - `E2E (Playwright)` (after you adopt this workflow)
   - **Require branches to be up to date before merging** (reduces “green on stale base” merges).
4. Optionally: **Require conversation resolution**, **block force pushes**, **include administrators** as you see fit.

## Notes

- Status check names must match the `name:` field of each job in the workflow (exact string GitHub shows in the PR checks UI).
- Until checks appear once on the default branch, they may not be selectable in the branch rule dropdown; push the workflow first or run **Actions** manually (`workflow_dispatch`).
