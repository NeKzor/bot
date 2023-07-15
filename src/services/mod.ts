/*
 * Copyright (c) 2023, NeKz
 *
 * SPDX-License-Identifier: MIT
 */

import { CVars } from "./cvars.ts";
import { Exploits } from "./exploits.ts";
import { LP } from "./lp.ts";
import { Piston } from "./piston.ts";
import { SAR } from "./sar.ts";
import { SpeedrunCom } from "./speedruncom.ts";

export const services = {
  "CVars": () => CVars.fetch,
  "SpeedrunCom": () => SpeedrunCom.fetch,
  "Piston": () => Piston.fetch,
  "SAR": () => SAR.fetch,
  "LP": () => LP.fetch,
  "Exploits": () => Exploits.load,
};

export const loadAllServices = async () => {
  await CVars.load();
  await SpeedrunCom.load();
  await Piston.load();
  await SAR.load();
  await Exploits.load();
};

export const getService = (service: string) => {
  return services[service as keyof typeof services];
};

const tryReload = (reloadFunc: () => Promise<void>) => async () => {
  try {
    await reloadFunc();
    return true;
  } catch (err) {
    console.error(err);
  }
  return false;
};

export const reloadService = async (
  toReload: ReturnType<typeof getService>,
) => {
  return await tryReload(toReload())();
};

export const reloadAllServices = async () => {
  const toReload = Object.entries(services);
  return await Promise.all(
    toReload.map(([_, func]) => tryReload(func())()),
  );
};
