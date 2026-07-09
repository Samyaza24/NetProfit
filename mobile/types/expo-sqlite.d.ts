// Workaround: this expo-sqlite version's package.json "exports" map lists the
// "default" condition before "types", so TS's bundler resolution never reaches
// the real .d.ts files. This ambient shim restores type visibility for the module.
declare module "expo-sqlite";
