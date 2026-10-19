# VEDA AI shared design assets (unreleased 0.1.0 snapshot)

Runtime assets copied unmodified from the shared design system.

- Upstream: `Yuzki/veda-ai-design-system` (private repository; not publicly available)
- Commit: `cad007687665115f8c0d8c4d19b92d4757d0d69d` (upstream PR #11: parent site
  navigation patterns, merge commit on `main`)
- Version: 0.1.0, unreleased (no tag exists; this is not a published release)
- Change since the previous pin `9d65cf4`: only `styles/components.css` changed (adds
  `.veda-parent-link` and `.veda-project-reference`). All other files are byte-identical.
- Adoption: the footer reference `p.veda-project-reference` with `common.project.related`
  (the Gandhari wording) linking to <https://veda-ai.org> in the same tab.
- Terms: the pinned source reports no license notice. No license is granted or
  implied here; the copies are used under the repository owner's authorization for
  this adoption only.

## Files and SHA-256

```text
96117f3d1cbc4d50da99b433be7225dbec3820f745c52c3769f59d2659fede86  styles/tokens.css
746846c45bd692f669ea5d84c06524c4e8a83cb887d1f0621acc245844e7ec50  styles/typography.css
fb3addbeb2a68104fab4e59ca5862cbf7998951e3b4850a77a042fbcc3a92000  styles/components.css
21b14301fd35499d5cc78a7f43d5b05f74b5bf46cc24591a0d2baf93a4321285  scripts/i18n.js
339ef814bc466d82a33bbdf8814b7934cf64b1d2457a083923e95efe8bf0953f  scripts/theme.js
071b65faf7399893061699706585def21e86a477f182c39b7610e7c6dd49b982  scripts/report.js
0feb48c3c782e7964dfb5d35a600933c99d6e963089875c943ca8efe4b3c7ebd  scripts/settings.js
```

Do not edit these files. Local adjustments belong in `css/style.css`; shared
defects are reported upstream. Application dictionaries live in `locales/`.

## Verify

```sh
cd vendor/veda-design/0.1.0-pilot-cad0076
sha256sum styles/*.css scripts/*.js
# or against the pinned source (needs access to the private repository):
for f in styles/tokens.css styles/typography.css styles/components.css scripts/i18n.js scripts/theme.js scripts/report.js scripts/settings.js; do
  git -C /path/to/veda-ai-design-system show cad007687665115f8c0d8c4d19b92d4757d0d69d:$f | cmp - $f
done
```

## Update and rollback

Import a new snapshot into a sibling directory using `git -C <source> show <commit>:<path>`,
record its commit and hashes in a new `SOURCE.md`, switch the paths in `index.html`
and the tests, and remove the superseded directory in the same change. Roll back with
`git revert` of that change, which restores the previous snapshot (`9d65cf4`) and paths.
