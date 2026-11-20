# Lições — publicação (site de teste no Railway)

- 20/11/2026: o Railway NÃO leu o comando de subida do `railway.json` no `railway up` (construção falhou: "No start command detected"). O comando e a checagem de saúde ficam gravados no serviço (API `serviceInstanceUpdate`). Conferir no `meta` da publicação se `startCommand` veio preenchido.
- 20/11/2026: publicar só os arquivos do site (`git archive <sha> package.json railway.json server shared public`): 4,7 MB em vez de 53 MB, e o que sobe é exatamente o commit testado.
- 20/11/2026: `rm -rf` é barrado pela trava das 24 h até na pasta de rascunho. Usar pasta nova com o sha no nome.
- 20/11/2026: a rede da sessão barra o endereço do site (403) até ele entrar na lista do ambiente; pedir a liberação do endereço exato logo depois de gerar o endereço.
- 20/11/2026: banco novo não gera a linha "cópia do banco" (nada para copiar). Para provar o disco: criar conta, reiniciar a publicação (`deploymentRestart`) e ler o perfil com a mesma sessão.
- 20/11/2026: navegador de teste contra site de fora precisa de `proxy: { server: process.env.HTTPS_PROXY }`; contra o localhost, não.
