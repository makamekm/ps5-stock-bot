# PS5 Stock Alert Telegram Bot

https://t.me/poland_ps5_stonk_alert_bot

This bot checks availability of PS5 in Poland online markets and sends Telegram notifications.

// Telegram bot can be run only one instance!

## Environments

Firstly, you need to create a Telegram bot following to Telegram API rules.

Secondly, you need to create a DROPBOX KEY to store information about user sessions.

Then just provide the collected data to the environment.

You can create a file `.env` with the next lines:

`TELEGRAM_BOT_KEY=...`

`DROPBOX_KEY=...`

Alternatively you can run in bash:

`export TELEGRAM_BOT_KEY=...`

`export DROPBOX_KEY=...`

## Production

`npm run build`

`npm start`

## Development

`npm run start:dev`

## Cloud

`NPM_CONFIG_PRODUCTION=false`

`ENV=prod`

`TELEGRAM_BOT_KEY=...`

`DROPBOX_KEY=...`

## Build Docker for Raspberry PI

`docker buildx build --platform linux/arm/v7 -t makame/ps5-stonk-bot:latest --push .`
