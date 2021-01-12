FROM node:lts
RUN apt update
RUN apt install python chromium -y
# RUN apk add --no-cache chromium --repository=http://dl-cdn.alpinelinux.org/alpine/v3.11/community
# RUN apk add python
WORKDIR /usr/src/app
COPY package*.json ./
RUN NPM_CONFIG_PRODUCTION=false PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install
COPY . .
RUN npm run build
ENV BROWSER=chromium
CMD [ "npm", "run", "start" ]