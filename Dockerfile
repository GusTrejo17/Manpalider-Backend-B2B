FROM node:8.7.0-alpine

RUN apk --no-cache add --virtual builds-deps build-base python

ENV dir /

RUN mkdir -p $dir

WORKDIR $dir

COPY package.json $dir
COPY package-lock.json $dir

RUN npm install

COPY . $dir

EXPOSE 3002
CMD ["npm", "start", "/bin/sh"]
