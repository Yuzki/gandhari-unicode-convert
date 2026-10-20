# VEDA AI shared design assets (unreleased 0.1.0 snapshot)

Runtime assets copied unmodified from the shared design system.

- Upstream: `Yuzki/veda-ai-design-system` (private repository; not publicly available)
- Commit: `d08f1bf748f5804fb376968f0378526727564ee4` (upstream PR #15: quiet UI rules,
  merge commit on `main`)
- Version: 0.1.0, unreleased (no tag exists; this is not a published release)
- Change since the previous pin `af6d1dc`: `styles/components.css` only. The other six
  files are byte-identical.
- Load order: `settings.js` then `theme.js` in `<head>` without `defer`; `i18n.js` and
  `report.js` deferred.
- Terms: the pinned source reports no license notice. No license is granted or
  implied here; the copies are used under the repository owner's authorization for
  this adoption only.

## Files and SHA-256

```text
96117f3d1cbc4d50da99b433be7225dbec3820f745c52c3769f59d2659fede86  styles/tokens.css
746846c45bd692f669ea5d84c06524c4e8a83cb887d1f0621acc245844e7ec50  styles/typography.css
ac637b12eeb252eb6b0647d53d20ef987cc72824cd9b46d2f5c2ea1ccbe93a97  styles/components.css
ec76b7eb940926d1d344efe5b9324c675fbf1b0d1cf977f5dfc57ae1953277d6  scripts/i18n.js
c5fb1d7093b10f52c4b13250fde39cd56390035973d8f3f060353a931e962db9  scripts/theme.js
071b65faf7399893061699706585def21e86a477f182c39b7610e7c6dd49b982  scripts/report.js
9b971ed13b198bfc2f8f9f5fb42df59ac3d0d21dcec1c5c06a0f0366260569a7  scripts/settings.js
```

Do not edit these files. Local adjustments belong in `css/style.css`; shared
defects are reported upstream. Application dictionaries live in `locales/`.

## Verify

The seven git blob ids of these files were compared with the upstream tree of the
pinned commit (GitHub git trees API, `git hash-object`) and match. To repeat:

```sh
cd vendor/veda-design/0.1.0-pilot-d08f1bf
sha256sum styles/*.css scripts/*.js
# or against the pinned source (needs access to the private repository):
for f in styles/tokens.css styles/typography.css styles/components.css scripts/i18n.js scripts/theme.js scripts/report.js scripts/settings.js; do
  git -C /path/to/veda-ai-design-system show d08f1bf748f5804fb376968f0378526727564ee4:$f | cmp - $f
done
```

## Update and rollback

Import a new snapshot into a sibling directory using `git -C <source> show <commit>:<path>`,
record its commit and hashes in a new `SOURCE.md`, switch the paths in `index.html`
and the tests, and remove the superseded directory in the same change. Roll back with
`git revert` of that change, which restores the previous snapshot (`af6d1dc`) and paths.
