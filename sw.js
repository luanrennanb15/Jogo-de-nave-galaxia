/* Astra Conflux — service worker
   Motivo de existir: no iPhone, o jogo adicionado à tela de início guarda
   uma cópia própria da página e não busca a nova sozinho. Sem isto, a única
   forma de atualizar era remover e recriar o ícone — e remover o ícone apaga
   o localStorage junto, que é onde ficam os saves.

   Estratégia: rede primeiro. Toda vez que o jogo abre, ele tenta buscar a
   versão nova do servidor; o cache só entra em campo se você estiver sem
   internet. Assim atualizar é só fechar e abrir o jogo. */

const CACHE = "astra-conflux-v1";

self.addEventListener("install", () => {
  self.skipWaiting();                      // não espera a aba antiga fechar
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();            // assume o controle já nesta abertura
  })());
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   // não mexe em nada de fora

  e.respondWith((async () => {
    try {
      // no-store aqui: queremos a resposta do servidor, não a do cache HTTP
      const nova = await fetch(req, { cache: "no-store" });
      if (nova && nova.ok && nova.type === "basic") {
        const c = await caches.open(CACHE);
        c.put(req, nova.clone()).catch(() => {});
      }
      return nova;
    } catch (err) {
      const guardada = await caches.match(req);
      if (guardada) return guardada;                 // sem internet: joga offline
      throw err;
    }
  })());
});

/* a página pode pedir uma checagem imediata de versão */
self.addEventListener("message", e => {
  if (e.data === "atualizar") self.registration.update().catch(() => {});
});
