#!/usr/bin/env bash

npm install -g pnpm

pnpm install --no-frozen-lockfile

cd artifacts/shifr

pnpm run build