# `/desenhe` (`/desenha`, `/draw`, `/img`) · admin

Desenha uma imagem com o GPT Image da OpenAI e manda no chat, com o pedido na legenda. Com `-gif`, faz um GIF animado (GPT Image 2.6). Só o dono e os admins usam (cada imagem custa créditos da OpenAI).

```text
/desenhe um gato astronauta em aquarela
→ 🎨 Desenhando, aguarde…
→ (a imagem, 1024x1024) 🎨 um gato astronauta em aquarela
```

Respondendo (reply) uma mensagem, o texto dela entra no pedido.

## GIF animado (`-gif`)

```text
/img -gif um gato dançando
→ 🎞️ Animando (9 quadros), aguarde…
→ (o GIF, em loop) 🎞️ um gato dançando

/img -gif -f 6 -ms 300 uma bandeira ao vento
```

- Usa o modelo do setting `openai.image.gifModel` (padrão `gpt-image-2.6-flare`; o `gpt-image-2.6-sunburst` é mais detalhado). Só a família 2.6 faz GIF.
- Cada quadro sai em 512x512: a OpenAI cobra os pixels de todos os quadros, então mais quadros custam mais.
- **Animar uma foto:** mande a foto com a legenda `/img -gif <o que fazer>`, ou responda uma foto com o comando. A foto vai para o endpoint de edição da OpenAI como referência, e a legenda dela entra no pedido.
- O WhatsApp não anima um `.gif`: o bot converte para MP4 com o ffmpeg e manda como GIF (em loop). Se a conversão falhar, o `.gif` chega como documento.
- O timeout do GIF é de no mínimo 5 minutos.

Usa a mesma chave do [`/gpt`](gpt.md): `OPENAI_API_KEY` no `config/.env` ou o setting `openai.api.key`. A imagem pode levar mais de um minuto: o timeout é o `openai.timeout.ms`, mas nunca menos de 3 minutos.

| Opção | Valor | Descrição |
|---|---|---|
| `-gif`, `-g` | | GIF animado (setting `openai.image.gifModel`). Numa foto, ou respondendo uma, anima a foto |
| `-frames`, `-f` | `<n>` | Quadros do GIF, de 2 a 16 (padrão 9). Vale como `-gif` |
| `-ms` | `<ms>` | Duração de cada quadro, de 20 a 2000 ms (padrão 200). Vale como `-gif` |
| `-model`, `-m` | `[modelo]` | Sem modelo, mostra o atual e a lista dos aceitos; com modelo, troca (setting `openai.image.model`, padrão `gpt-image-2`; com `-gif`, o `openai.image.gifModel`) |
