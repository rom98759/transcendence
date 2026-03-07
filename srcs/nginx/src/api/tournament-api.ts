// ============================================================================
// tournament-api.ts — Couche API dédiée au module Tournament
//
// Centralise tous les appels HTTP vers les endpoints tournoi du backend.
// Aucune logique métier ici — juste du transport typé.
// ============================================================================

import api from './api-client';
import type {
  TournamentDTO,
  PlayerDTO,
  TournamentFullStateDTO,
  MatchToPlayDTO,
  MatchSessionDTO,
} from '@transcendence/core';

// ── Create / Join ───────────────────────────────────────────────────────────

/** Crée un nouveau tournoi. Retourne l'ID du tournoi créé. */
export async function createTournament(): Promise<number> {
  const { data } = await api.post<number>('/game/create-tournament', {});
  return data;
}

/** Rejoint un tournoi existant. */
export async function joinTournament(tournamentId: string): Promise<void> {
  await api.post(`/game/tournaments/${tournamentId}`, {});
}

// ── Read ────────────────────────────────────────────────────────────────────

/** Liste les tournois disponibles (PENDING / STARTED). */
export async function listTournaments(): Promise<TournamentDTO[]> {
  const { data } = await api.get<TournamentDTO[]>('/game/tournaments');
  return data;
}

/** Retourne les joueurs d'un tournoi (slots). */
export async function getTournamentPlayers(tournamentId: string): Promise<PlayerDTO[]> {
  const { data } = await api.get<PlayerDTO[]>(`/game/tournaments/${tournamentId}`);
  return data;
}

/**
 * Retourne l'état complet du tournoi : status, players, matches (avec scores/usernames).
 * Endpoint principal pour reconstruire le bracket côté frontend.
 */
export async function getTournamentState(tournamentId: string): Promise<TournamentFullStateDTO> {
  const { data } = await api.get<TournamentFullStateDTO>(`/game/tournaments/${tournamentId}/state`);
  return data;
}

/** Retourne le prochain match à jouer pour le joueur courant, ou null si aucun. */
export async function getMatchToPlay(tournamentId: string): Promise<MatchToPlayDTO | null> {
  const { data } = await api.get<MatchToPlayDTO | null>(
    `/game/tournaments/${tournamentId}/match-to-play`,
  );
  return data ?? null;
}

// ── Match resolution ────────────────────────────────────────────────────────

/** Résout un matchId vers les infos de session (sessionId, tournamentId, etc.). */
export async function getMatchSession(matchId: string): Promise<MatchSessionDTO> {
  const { data } = await api.get<MatchSessionDTO>(`/game/matches/${matchId}/session`);
  return data;
}
