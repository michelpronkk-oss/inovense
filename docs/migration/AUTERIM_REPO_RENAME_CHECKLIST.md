# Repository rename checklist

Target repository:

`michelpronkk-oss/inovense` → `michelpronkk-oss/auterim`

This checklist is preparation only. The repository was not renamed and no remote was changed.

Before renaming:

- Update README clone URLs, badges, and issue links.
- Audit CI workflow URLs, package metadata, Trigger configuration, and Vercel linkage.
- Check local scripts and documentation for absolute folder paths.
- Update external webhooks and deployment integrations only after provider coordination.
- Confirm GitHub Actions secrets and environment names remain available.
- Confirm branch protection, deploy keys, webhooks, and OAuth apps.

After GitHub performs the rename, update a local remote with:

```powershell
git remote -v
git remote set-url origin https://github.com/michelpronkk-oss/auterim.git
git remote -v
```

Do not execute repository renaming automatically. Verify Vercel, Trigger, Nango, Slack, Supabase, Dodo, Resend, and Google integrations after the remote change.
