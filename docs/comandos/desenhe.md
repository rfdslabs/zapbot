# `/desenhe` (`/desenha`, `/draw`, `/img`) · admin

Desenha uma imagem com o GPT Image da OpenAI e manda no chat, com o pedido na legenda. Só o dono e os admins usam (cada imagem custa créditos da OpenAI).

```text
/desenhe um gato astronauta em aquarela
→ 🎨 Desenhando, aguarde…
→ (a imagem, 1024x1024) 🎨 um gato astronauta em aquarela
```

Respondendo (reply) uma mensagem, o texto dela entra no pedido.

Usa a mesma chave do [`/gpt`](gpt.md): `OPENAI_API_KEY` no `config/.env` ou o setting `openai.api.key`. A imagem pode levar mais de um minuto: o timeout é o `openai.timeout.ms`, mas nunca menos de 3 minutos.

| Opção | Valor | Descrição |
|---|---|---|
| `-model`, `-m` | `[modelo]` | Sem modelo, mostra o atual e a lista dos aceitos; com modelo, troca (setting `openai.image.model`, padrão `gpt-image-2`) |
