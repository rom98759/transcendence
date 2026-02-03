import { Agent } from 'undici';
import fs from 'fs';
import { MTLSRequestInit } from '../types/https.js';

// Configuration pour le mTLS compatible avec fetch()
export const mtlsAgent = new Agent({
  connect: {
    key: fs.readFileSync('/etc/certs/auth-service.key'),
    cert: fs.readFileSync('/etc/certs/auth-service.crt'),
    ca: fs.readFileSync('/etc/ca/ca.crt'),
    rejectUnauthorized: true,
  },
});

export const fetchOptions: MTLSRequestInit = {
  method: 'GET',
  dispatcher: mtlsAgent,
};
