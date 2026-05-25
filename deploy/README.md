# Deploy — `scroll.ezeangeloni.xyz`

Static Astro site, IONOS VPS, nginx + Certbot, GitHub Actions rsync.

## 1. DNS (done)

A record `scroll → 82.165.93.34` at IONOS.

## 2. VPS — one-time setup

SSH in as root:

```bash
ssh root@82.165.93.34
```

Create the web root with the right ownership (mirror the `eze` setup — owner is the `eze` user that rsync logs in as):

```bash
mkdir -p /var/www/scroll.ezeangeloni.xyz/html
chown -R eze:eze /var/www/scroll.ezeangeloni.xyz
chmod 755 /var/www/scroll.ezeangeloni.xyz
```

Drop in the nginx config (copy `deploy/nginx-scroll.conf` from this repo):

```bash
# from local — adjust path if needed
scp deploy/nginx-scroll.conf root@82.165.93.34:/etc/nginx/sites-available/scroll.ezeangeloni.xyz

# back on VPS:
ln -sf /etc/nginx/sites-available/scroll.ezeangeloni.xyz /etc/nginx/sites-enabled/
nginx -t                       # syntax check
systemctl reload nginx
```

Issue an SSL cert (this also rewrites the config to add :443 + cert paths):

```bash
certbot --nginx -d scroll.ezeangeloni.xyz --non-interactive --agree-tos -m e.zeangeloni@gmail.com --redirect
```

Sanity check:

```bash
curl -I https://scroll.ezeangeloni.xyz   # expect 200 (or 404 until first deploy)
```

## 3. GitHub repo + secrets

```bash
gh repo create ezecodo/scroll-playground --public --source=. --remote=origin --push
```

Add the three deploy secrets (copy values from any other repo on this VPS, e.g. `eze`):

```bash
gh secret set VPS_HOST    --body "82.165.93.34"
gh secret set VPS_USER    --body "eze"
gh secret set VPS_SSH_KEY < ~/.ssh/<the-deploy-key>
```

If you don't remember which key, list them in the `eze` repo:

```bash
gh secret list --repo ezecodo/eze
```

## 4. First deploy

Push to `main` — the workflow at `.github/workflows/deploy.yml` builds and rsyncs `dist/` to `/var/www/scroll.ezeangeloni.xyz/html/`.

```bash
git push -u origin main
```

Watch it:

```bash
gh run watch
```

## 5. Subsequent deploys

`git push` to `main`. That's it.

## Rollback

There's no "previous build" preserved — rsync `--delete` wipes overwrites. To recover from a bad deploy, revert the offending commit and push:

```bash
git revert HEAD
git push
```

## Troubleshooting

- **502 / 404 right after first deploy** → check `ls /var/www/scroll.ezeangeloni.xyz/html/` on the VPS, the dist should be there. If not, the rsync failed — check the Action logs.
- **Cert renew issues** → `certbot renew --dry-run`. The cron is already set up globally.
- **nginx test fails** after editing → `nginx -t` shows the line. Restore from `/etc/nginx/sites-available/scroll.ezeangeloni.xyz.bak` if you made one before editing.
