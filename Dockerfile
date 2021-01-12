FROM arm32v7/node
RUN apt-get update
RUN apt-get install chromium --yes
WORKDIR /usr/src/app
COPY package*.json ./
RUN NPM_CONFIG_PRODUCTION=false PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install
COPY . .
RUN npm run build
ENV BROWSER=chromium
CMD [ "npm", "run", "start" ]