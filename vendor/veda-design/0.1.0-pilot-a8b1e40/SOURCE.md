# VEDA AI shared design assets (unreleased 0.1.0 snapshot)

Runtime assets copied unmodified from the shared design system.

- Upstream: `Yuzki/veda-ai-design-system` (private repository; not publicly available)
- Commit: `a8b1e40dfa4666e0925f5fcc95abb0d9d7004bb1` (upstream PR #17: icon display
  settings, merge commit on `main`)
- Version: 0.1.0, unreleased (no tag exists; this is not a published release)
- Change since the previous pin `d08f1bf`: `styles/components.css`, `scripts/i18n.js`,
  `scripts/settings.js` and `scripts/theme.js`. `tokens.css`, `typography.css` and
  `report.js` are byte-identical.
- Load order: `settings.js` then `theme.js` in `<head>` without `defer`; `i18n.js` and
  `report.js` deferred.
- Terms: the pinned source reports no license notice. No license is granted or
  implied here; the copies are used under the repository owner's authorization for
  this adoption only.

## Files and SHA-256

```text
96117f3d1cbc4d50da99b433be7225dbec3820f745c52c3769f59d2659fede86  styles/tokens.css
746846c45bd692f669ea5d84c06524c4e8a83cb887d1f0621acc245844e7ec50  styles/typography.css
79c9449265da09a4039e95e8f3f143c281822b1d6adc4125cb3437e140fcca22  styles/components.css
aee984c17d03d56c123ad94f2d59d90867f9714898697340be08596acddc394e  scripts/i18n.js
37fb7483a57ca74a60f2444c2dae2a1abe9ef5cdc13cc04c5a24248adb69419f  scripts/theme.js
071b65faf7399893061699706585def21e86a477f182c39b7610e7c6dd49b982  scripts/report.js
cf861ac785fcb00813cd42f5200692dc91a4c72e65f71560c1b430ee57e9cb27  scripts/settings.js
```

Do not edit these files. Local adjustments belong in `css/style.css`; shared
defects are reported upstream. Application dictionaries live in `locales/`.

## Verify

The seven git blob ids of these files were compared with the upstream tree of the
pinned commit (GitHub git trees API, `git hash-object`) and match. To repeat:

```sh
cd vendor/veda-design/0.1.0-pilot-a8b1e40
sha256sum styles/*.css scripts/*.js
# or against the pinned source (needs access to the private repository):
for f in styles/tokens.css styles/typography.css styles/components.css scripts/i18n.js scripts/theme.js scripts/report.js scripts/settings.js; do
  git -C /path/to/veda-ai-design-system show a8b1e40dfa4666e0925f5fcc95abb0d9d7004bb1:$f | cmp - $f
done
```

## Update and rollback

Import a new snapshot into a sibling directory using `git -C <source> show <commit>:<path>`,
record its commit and hashes in a new `SOURCE.md`, switch the paths in `index.html`
and the tests, and remove the superseded directory in the same change. Roll back with
`git revert` of that change, which restores the previous snapshot (`d08f1bf`) and paths.
