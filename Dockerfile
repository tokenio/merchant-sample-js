FROM node:10

# non-root user 'node' is defined by the base image
ENV HOME=/home/node

# copy package.json and package-lock.json
COPY package*.json $HOME/merchant-sample-js/

WORKDIR $HOME/merchant-sample-js
RUN npm install

# copy full project code into '$HOME/merchant-sample-js'
COPY . .

CMD ["node", "server.js"]
