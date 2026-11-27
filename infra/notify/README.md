# Telegram notifications

The V-Menu bot (`@VMenuServerBot`) posts to the team's Telegram chat when:

| Source | Messages |
|---|---|
| Release, Deploy, Rollback, Monitoring | 🚀 when they start, then ✅ ❌ ⏹️ ⏱️ when they end |
| CI, Code scanning, Deploy test | ✅ or ❌ when they end |
| Grafana alerts | server down, high CPU, low disk, errors, slow requests and the rest of `infra/monitoring/alerts` |

A message names the pipeline, the environment, the commit or PR, who started it, the jobs that failed, how long it took and a link to the run:

```
❌ Release failed · production
feat(menu): filter dishes by category (#240)
Branch main · 1a2b3c4 · RaksaOC
Failed: deploy / deploy (production)
Took 6 min 12 s
https://github.com/RaksaOC/V-Menu/actions/runs/...
```

To keep the chat useful, these send nothing: checks a newer push cancelled, skipped runs, Dependabot's passing runs, and anything from a fork.

## Files

| File | What it is |
|---|---|
| `../../.github/workflows/notify.yml` | Runs after each pipeline above, and on demand for a test message |
| `telegram.mjs` | Decides whether a run is worth a message, writes it and sends it |
| `../../scripts/telegram-notify.test.mjs` | Tests for both, run by `npm run test:repo` |

## Set it up (once)

1. **Get a fresh token.** In Telegram, message `@BotFather`, send `/revoke`, pick `@VMenuServerBot` and copy the new token. Do this if the token was ever pasted anywhere other than a secret store.
2. **Make the chat.** Create a Telegram group for the team and add `@VMenuServerBot` to it.
3. **Find the chat ID.** In the group, send `/start@VMenuServerBot`. Then open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser and find `"chat":{"id":-100…`. Copy the whole number, minus sign included.
4. **Add two secrets** in GitHub under **Settings > Secrets and variables > Actions > New repository secret**. This needs a repository admin.
   - `TELEGRAM_BOT_TOKEN`: the token from step 1
   - `TELEGRAM_CHAT_ID`: the number from step 3
5. **Send a test.** In **Actions > Notify**, click **Run workflow** on `staging`. The group should get "🔔 V-Menu notifications are working".

Until both secrets exist, the workflow sends nothing and still passes.

## Server alerts in Telegram

Grafana sends the alerts itself, so they reach the chat even when GitHub is down.

1. In Grafana, open **Alerts & IRM > Alerting > Notification configuration**, then **Edit** on the **V-Menu email** contact point.
2. Click **Add contact point integration**, choose **Telegram**, and paste the same bot token and chat ID.
3. Click **Test**, then **Save contact point**.

Every V-Menu alert then goes to email and Telegram.

## Change what is sent

- **Watch another pipeline:** add its `name:` to `workflows:` in `notify.yml`. The test fails if a name does not match a real workflow.
- **Announce another pipeline's start:** add it to `SERVER_PIPELINES` in `telegram.mjs` and to the list in the job's `if:` in `notify.yml`.

`notify.yml` only takes effect from the default branch (`staging`), so a change to it works after it is merged.
