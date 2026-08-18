import { Capacitor } from "@capacitor/core";

export function isNativeCapacitor(): boolean {
  return Capacitor.isNativePlatform();
}

