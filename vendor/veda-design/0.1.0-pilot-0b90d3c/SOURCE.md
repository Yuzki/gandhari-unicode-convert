# VEDA AI shared design assets (unreleased 0.1.0 snapshot)

Runtime assets copied unmodified from the shared design system.

- Upstream: `Yuzki/veda-ai-design-system` (private repository; not publicly available)
- Commit: `0b90d3c2a06d58212f4fa14965cec31b8ea99dde`
- Version: 0.1.0, unreleased (no tag exists; this is not a published release)
- Change since the previous pin `fbeb384`: adds the optional `scripts/report.js`
  (footer "Report a problem" link, upstream <https://github.com/Yuzki/veda-ai-design-system/pull/4>).
  The other five files are byte-identical to the `fbeb384` copies.
- Adoption issue: <https://github.com/Yuzki/gandhari-unicode-convert/issues/6>
- Method follows the pilot: <https://github.com/Yuzki/ewaia-abbreviations/pull/4>
- Terms: the pinned source and the pilot report no license notice. No license is
  granted or implied here; the copies are used under the repository owner's
  authorization for this adoption only.

## Files and SHA-256

```text
96117f3d1cbc4d50da99b433be7225dbec3820f745c52c3769f59d2659fede86  styles/tokens.css
746846c45bd692f669ea5d84c06524c4e8a83cb887d1f0621acc245844e7ec50  styles/typography.css
458981db57c9c12a8804b1b7fb9fbaca52ee4eb17d18c0c30cd76cd2f9c2dbc0  styles/components.css
7a463f9787edd43794eb3b735d3e4ae3c4698a3dcf1fbfec5a26d123c6f02c8b  scripts/i18n.js
ae6b2d82697ae37f6ad0233263cfbaf3ef00d4e9103041cabca163718c245cb5  scripts/theme.js
071b65faf7399893061699706585def21e86a477f182c39b7610e7c6dd49b982  scripts/report.js
```

Do not edit these files. Local adjustments belong in `css/style.css`; shared
defects are reported upstream. Application dictionaries live in `locales/`.

## Verify

```sh
cd vendor/veda-design/0.1.0-pilot-0b90d3c
sha256sum styles/*.css scripts/*.js
# or against the pinned source (needs access to the private repository):
for f in styles/tokens.css styles/typography.css styles/components.css scripts/i18n.js scripts/theme.js scripts/report.js; do
  git -C /path/to/veda-ai-design-system show 0b90d3c2a06d58212f4fa14965cec31b8ea99dde:$f | cmp - $f
done
```

## Update and rollback

Import a new snapshot into a sibling directory (for example
`vendor/veda-design/<version>/`) using `git -C <source> show <commit>:<path>`,
record its commit and hashes in a new `SOURCE.md`, switch the paths in
`index.html`, and remove the superseded directory in the same change. Roll back
with `git revert` of that change, which restores the previous snapshot and paths.
