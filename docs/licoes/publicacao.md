# Lições — publicação (site de teste no Railway)

- 20/11/2026: o Railway NÃO leu o comando de subida do `railway.json` no `railway up` (construção falhou: "No start command detected"). O comando e a checagem de saúde ficam gravados no serviço (API `serviceInstanceUpdate`). Conferir no `meta` da publicação se `startCommand` veio preenchido.
- 20/11/2026: publicar só os arquivos do site (`git archive <sha> package.json railway.json server shared public`): 4,7 MB em vez de 53 MB, e o que sobe é exatamente o commit testado.
- 20/11/2026: `rm -rf` é barrado pela trava das 24 h até na pasta de rascunho. Usar pasta nova com o sha no nome.
- 20/11/2026: a rede da sessão barra o endereço do site (403) até ele entrar na lista do ambiente; pedir a liberação do endereço exato logo depois de gerar o endereço.
- 20/11/2026: banco novo não gera a linha "cópia do banco" (nada para copiar). Para provar o disco: criar conta, reiniciar a publicação (`deploymentRestart`) e ler o perfil com a mesma sessão.
- 20/11/2026: navegador de teste contra site de fora precisa de `proxy: { server: process.env.HTTPS_PROXY }`; contra o localhost, não.
- 20/11/2026: o proxy do Railway liga de 100.64.0.x e TROCA de endereço (vimos .2 e .8): endereço exato em `TRUST_PROXY_IPS` não basta; usar a menor faixa que cobre o que o log mostrar.
- 20/11/2026: os pedidos desta nuvem saem por vários endereços. Prova de limite "por endereço" feita daqui engana (6 contas passaram por causa disso, não por falha). Prova que serve: repetir o MESMO endereço forjado com um apelido que já existe (não cria conta; conta no limite) e cruzar com `httpLogs` (`srcIp` de cada pedido).
- 20/11/2026: prova no site no ar não deve criar conta: 12 contas vazias sobraram no banco de teste. Usar apelido já existente (resposta 409) sempre que der.
- 20/11/2026: avisar o caçador de bugs antes de republicar (o site reinicia; queda de alguns segundos não é bug).
