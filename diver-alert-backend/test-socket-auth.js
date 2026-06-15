/**
 * test-socket-auth.js
 *
 * Script de test manuel pour l'authentification Socket.io.
 * Lance APRÈS avoir récupéré un token via POST /api/auth/login.
 *
 * Usage :
 *   1. node test-socket-auth.js
 *   Remplace TOKEN_ICI par le token obtenu au login
 */

const { io } = require('socket.io-client');

// ← Remplace par le token reçu depuis POST /api/auth/login
const VALID_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMmZhYjc3MzFkMGMxMThiZDEzNjQ5NCIsImlhdCI6MTc4MTUwOTAwNywiZXhwIjoxNzgxNTk1NDA3fQ.6Xdx7pc2FSunkCytnL4ftBarv6NaUbsGgvkWXBkwDl0';

const BASE_URL = 'http://localhost:5000';
let passed = 0;
let failed = 0;

const ok = (msg) => { console.log('✅', msg); passed++; };
const err = (msg) => { console.log('❌', msg); failed++; };

// ── Test 1 : Sans token → rejeté ─────────────────────────────────────────────
const s1 = io(BASE_URL, { transports: ['websocket'], reconnection: false });

s1.on('connect', () => { err('T1 — Connecté sans token (inattendu)'); s1.close(); runTest2(); });
s1.on('connect_error', (e) => { ok(`T1 — Rejeté sans token : ${e.message}`); s1.close(); runTest2(); });

// ── Test 2 : Token invalide → rejeté ─────────────────────────────────────────
function runTest2() {
    const s2 = io(BASE_URL, {
        auth: { token: 'eyJ.token.invalide' },
        transports: ['websocket'],
        reconnection: false,
    });

    s2.on('connect', () => { err('T2 — Connecté avec token invalide (inattendu)'); s2.close(); runTest3(); });
    s2.on('connect_error', (e) => { ok(`T2 — Rejeté token invalide : ${e.message}`); s2.close(); runTest3(); });
}

// ── Test 3 : Token valide → connecté + liste reçue ───────────────────────────
function runTest3() {
    if (VALID_TOKEN === 'COLLE_TON_TOKEN_ICI') {
        console.log('⚠️  T3 — SKIPPED : remplace VALID_TOKEN par un vrai token JWT');
        printSummary();
        return;
    }

    const s3 = io(BASE_URL, {
        auth: { token: VALID_TOKEN },
        transports: ['websocket'],
        reconnection: false,
    });

    s3.on('connect', () => ok(`T3 — Connecté avec token valide : ${s3.id}`));
    s3.on('divers:list', (list) => {
        ok(`T3 — Liste reçue : ${list.length} plongeur(s) connecté(s)`);
        console.log('     Contenu :', JSON.stringify(list, null, 2));
        s3.disconnect();
        printSummary();
    });
    s3.on('connect_error', (e) => { err(`T3 — Erreur inattendue : ${e.message}`); printSummary(); });

    setTimeout(() => { err('T3 — Timeout'); s3.close(); printSummary(); }, 4000);
}

function printSummary() {
    console.log(`\n── Résumé : ${passed} ✅  ${failed} ❌ ──`);
    process.exit(failed > 0 ? 1 : 0);
}