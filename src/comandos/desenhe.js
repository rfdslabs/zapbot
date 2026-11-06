/*
 * Comando /desenhe: gera uma imagem com o GPT Image (OpenAI); com -gif, um GIF animado.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const axios = require('axios');
const { MessageMedia } = require('whatsapp-web.js');

const { getCommandSyntax } = require('./base');
const { BIN_FFMPEG } = require('../constantes');
const { printError } = require('../log');
const { OPENAI_MODELOS_GIF, OPENAI_MODELOS_IMAGEM } = require('../openai');
const { SEM_CHAVE, chaveOpenAi, erroOpenAi } = require('../openaiChat');
const { envOuSetting, getSetting, setSetting } = require('../settings');
const { runCommand } = require('../util/processos');

const OPENAI_IMAGENS_URL = 'https://api.openai.com/v1/images/generations';
const OPENAI_EDICOES_URL = 'https://api.openai.com/v1/images/edits';

// Uma imagem leva bem mais que uma resposta de texto: no mínimo 3 minutos (o GIF, 5)
const TIMEOUT_MINIMO_MS = 180000;
const TIMEOUT_GIF_MS = 300000;

// A legenda leva o pedido, cortado se for longo
const LEGENDA_MAX = 200;

/*
 * GIF (Image API, família 2.6): de 2 a 16 quadros, de 20 a 2000 ms cada. Os
 * quadros saem em 512x512, não 1024: a OpenAI cobra os pixels de todos eles.
 */
const GIF_QUADROS = { padrao: 9, min: 2, max: 16 };
const GIF_MS = { padrao: 200, min: 20, max: 2000 };
const GIF_TAMANHO = '512x512';

// A conversão de um GIF de poucos segundos para MP4 é rápida
const FFMPEG_TIMEOUT_MS = 60000;

// /desenhe -m (ou -gif -m): sem modelo lista o atual e os aceitos; com modelo, grava o setting
async function trocarModelo(msg, modelo, gif) {
    const setting = gif ? 'openai.image.gifModel' : 'openai.image.model';
    const nome = gif ? '/desenhe -gif' : '/desenhe';

    if (!modelo) {
        const atual = getSetting(setting);
        const aceitos = gif ? OPENAI_MODELOS_GIF : OPENAI_MODELOS_IMAGEM;
        await msg.reply(`🎨 *Modelo do ${nome}:* ${atual}\n\n*Aceitos:*\n` +
            aceitos.map(m => `${m === atual ? '✅' : '▫️'} ${m}`).join('\n') +
            `\n\n💡 _${nome} -m <modelo> troca (setting ${setting})._`);
        return;
    }

    try {
        await setSetting(setting, modelo);
    } catch (e) {
        await msg.reply(`❌ Modelo ${e.message}`);
        return;
    }
    await msg.reply(`✅ Modelo do ${nome}: *${getSetting(setting)}*`);
}

/**
 * Pede a imagem (ou o GIF) à OpenAI e devolve o arquivo em base64. Com `foto`
 * ({ mimetype, data }), vai para o endpoint de edição, que a usa de referência.
 * Em erro, registra no log (sem a chave) e lança o erro do axios.
 */
async function gerarImagem(pedido, { gif = null, foto = null } = {}) {
    const campos = gif
        ? {
            model: getSetting('openai.image.gifModel'),
            prompt: pedido,
            n: 1,
            size: GIF_TAMANHO,
            output_format: 'gif',
            frame_count: gif.quadros,
            frame_duration_ms: gif.ms
        }
        : { model: getSetting('openai.image.model'), prompt: pedido, n: 1, size: '1024x1024' };

    // A edição só aceita multipart/form-data, com a foto como arquivo
    let corpo = campos;
    if (foto) {
        corpo = new FormData();
        for (const [chave, valor] of Object.entries(campos)) corpo.append(chave, String(valor));
        const extensao = foto.mimetype.split('/')[1]?.split(';')[0] || 'png';
        corpo.append('image', new Blob([Buffer.from(foto.data, 'base64')], { type: foto.mimetype }), `foto.${extensao}`);
    }

    const timeoutMinimo = gif ? TIMEOUT_GIF_MS : TIMEOUT_MINIMO_MS;

    try {
        const { data } = await axios.post(foto ? OPENAI_EDICOES_URL : OPENAI_IMAGENS_URL, corpo, {
            headers: { Authorization: `Bearer ${chaveOpenAi()}` },
            timeout: Math.max(envOuSetting('OPENAI_TIMEOUT_MS', 'openai.timeout.ms'), timeoutMinimo)
        });

        const base64 = data.data?.[0]?.b64_json;
        if (!base64) throw new Error('a OpenAI não devolveu a imagem');
        return base64;
    } catch (err) {
        // No 401 a mensagem da OpenAI traz um pedaço da chave: não vai para o log
        const status = err.response?.status;
        printError('/desenhe:', status ?? '', status === 401 ? 'API key inválida' : err.response?.data?.error?.message || err.message);
        throw err;
    }
}

/*
 * O WhatsApp não anima um .gif enviado como imagem: o GIF vira um MP4 (H.264,
 * dimensões pares) e vai com sendVideoAsGif, como os do /giphy.
 */
async function gifParaMp4(base64) {
    const pasta = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'zapbot-gif-'));
    try {
        const entrada = path.join(pasta, 'desenho.gif');
        const saida = path.join(pasta, 'desenho.mp4');
        await fs.promises.writeFile(entrada, Buffer.from(base64, 'base64'));
        await runCommand(BIN_FFMPEG, [
            '-y', '-i', entrada,
            '-movflags', '+faststart', '-pix_fmt', 'yuv420p',
            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
            '-c:v', 'libx264', '-an',
            saida
        ], 'ignore', FFMPEG_TIMEOUT_MS);
        return (await fs.promises.readFile(saida)).toString('base64');
    } finally {
        await fs.promises.rm(pasta, { recursive: true, force: true });
    }
}

// -frames/-ms: número inteiro dentro do intervalo; null se ausente; lança se inválido
function lerInteiro(valor, { min, max }, nome) {
    if (valor == null) return null;
    const n = Number(valor);
    if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${nome} precisa ser um inteiro de ${min} a ${max}.`);
    return n;
}

// A foto que o GIF anima: a da própria mensagem (legenda "/desenhe -gif ...") ou a da respondida
async function fotoDeReferencia(msg, quotedMsg) {
    for (const m of [msg, quotedMsg]) {
        if (!m?.hasMedia || m.type !== 'image') continue;
        const midia = await m.downloadMedia();
        if (midia?.data) return midia;
    }
    return null;
}

async function cmdDesenhe({ msg, args, opts, quotedMsg }) {
    // -frames e -ms valem como -gif
    const gif = Boolean(opts?.opt.gif || opts?.given.has('frames') || opts?.given.has('ms'));

    if (opts?.given.has('model')) {
        await trocarModelo(msg, opts.opt.model, gif);
        return;
    }

    if (!chaveOpenAi()) {
        await msg.reply(SEM_CHAVE('/desenhe'));
        return;
    }

    let animacao = null;
    if (gif) {
        try {
            animacao = {
                quadros: lerInteiro(opts.opt.frames, GIF_QUADROS, '-frames') ?? GIF_QUADROS.padrao,
                ms: lerInteiro(opts.opt.ms, GIF_MS, '-ms') ?? GIF_MS.padrao
            };
        } catch (e) {
            await msg.reply(`❌ ${e.message}`);
            return;
        }
    }

    // Sem opções, o texto vai como foi digitado (com os Enters); com -gif, sem as opções
    const digitado = gif ? opts.argv.join(' ') : args;
    // Respondendo uma mensagem, o texto dela entra antes do pedido (numa foto, a legenda)
    const pedido = [quotedMsg?.body, digitado].filter(Boolean).join('\n\n').trim();

    if (!pedido) {
        await msg.reply('```' + getCommandSyntax('/desenhe') + '```');
        return;
    }

    try {
        const foto = gif ? await fotoDeReferencia(msg, quotedMsg) : null;
        await msg.reply(gif
            ? `🎞️ Animando${foto ? ' a foto' : ''} (${animacao.quadros} quadros), aguarde…`
            : '🎨 Desenhando, aguarde…');

        const base64 = await gerarImagem(pedido, { gif: animacao, foto });
        const legenda = pedido.length > LEGENDA_MAX ? `${pedido.slice(0, LEGENDA_MAX)}…` : pedido;

        if (!gif) {
            await msg.reply(new MessageMedia('image/png', base64, 'desenho.png'), undefined, { caption: `🎨 ${legenda}` });
            return;
        }

        let mp4;
        try {
            mp4 = await gifParaMp4(base64);
        } catch (err) {
            // Sem a conversão, o GIF ainda chega: como documento, para baixar e abrir
            printError('/desenhe -gif: ffmpeg falhou:', err.message);
            await msg.reply(new MessageMedia('image/gif', base64, 'desenho.gif'), undefined,
                { caption: `🎞️ ${legenda}`, sendMediaAsDocument: true });
            return;
        }
        await msg.reply(new MessageMedia('video/mp4', mp4, 'desenho.mp4'), undefined,
            { caption: `🎞️ ${legenda}`, sendVideoAsGif: true });
    } catch (err) {
        await msg.reply(erroOpenAi(err, '/desenhe'));
    }
}

module.exports = {
    cmdDesenhe
};
