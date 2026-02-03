import { Dispatcher } from 'undici';

/**
 * Interface étendue pour les requêtes internes mTLS
 * Utilisable partout où fetch est appelé entre microservices.
 */
export interface MTLSRequestInit extends RequestInit {
  dispatcher?: Dispatcher;
}
