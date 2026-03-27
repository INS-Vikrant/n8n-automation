FROM node:20-alpine AS base

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
COPY prisma ./prisma/

RUN npx prisma generate
RUN yarn build

EXPOSE 3000

CMD ["yarn", "start"]
