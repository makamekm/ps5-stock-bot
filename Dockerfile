FROM arm32v7/node
RUN apt-get install chromium-browser --yes
WORKDIR /usr/src/app
COPY package*.json ./
RUN NPM_CONFIG_PRODUCTION=false npm install
COPY . .
RUN npm build
ENV BROWSER=chromium-browser
CMD [ "npm", "run", "start" ]