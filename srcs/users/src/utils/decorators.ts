/* eslint-disable @typescript-eslint/no-explicit-any */

import { logger } from './logger.js';

export function Trace(_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    logger.trace({ msg: `Call: ${propertyKey}`, args });
    return originalMethod.apply(this, args);
  };

  return descriptor;
}
