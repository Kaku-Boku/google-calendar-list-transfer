#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';
import { MANUAL_CONFIG_FILE, readManualConfig, writeManualConfig } from './manual/config.mjs';

function publisherFromArgs(args) {
  let publisher = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--publisher') publisher = args[++i] || '';
    else if (args[i].startsWith('--publisher=')) publisher = args[i].slice('--publisher='.length);
    else throw new Error(`不明な引数: ${args[i]}`);
  }
  return publisher || process.env.MANUAL_PUBLISHER || '';
}

export async function configurePublisher(args = []) {
  let publisher = publisherFromArgs(args);
  if (!publisher && existsSync(MANUAL_CONFIG_FILE)) {
    const config = readManualConfig();
    console.log(`マニュアル発行者のローカル設定を維持します: ${config.publisher}`);
    return config;
  }
  if (!publisher && process.stdin.isTTY && process.stdout.isTTY) {
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    try { publisher = await prompt.question('マニュアルに表示する発行者名: '); }
    finally { prompt.close(); }
  }
  if (!publisher) {
    throw new Error('発行者名を --publisher または MANUAL_PUBLISHER で指定してください。');
  }
  const config = writeManualConfig(publisher);
  console.log('Git対象外の tooling/manual.json にマニュアル発行者を保存しました。');
  return config;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await configurePublisher(process.argv.slice(2));
}
