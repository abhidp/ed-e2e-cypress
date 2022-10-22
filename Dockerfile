FROM cypress/included:10.2.0

# This helps to clean up the console output
ENV CI=1
ENV YARN_CACHE_FOLDER="/yarn"

WORKDIR /e2e

COPY ./yarn.lock ./yarn.lock
COPY ./package.json ./package.json
RUN --mount=type=cache,target=/yarn \
    for i in 1 2 3; do yarn install --production --frozen-lockfile && break || sleep 1; done

COPY . .

# Verify Cypress installation worked
RUN npx cypress verify
RUN npx cypress version

ENTRYPOINT []
