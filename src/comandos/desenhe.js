/*
 * Comando /desenhe: gera uma imagem com o GPT Image (OpenAI).
 */

const axios = require('axios');
const { MessageMedia } = require('whatsapp-web.js');

const { getCommandSyntax } = require('./base');
const { printError } = require('../log');
const { OPENAI_MODELOS_IMAGEM } = require('../openai');
const { SEM_CHAVE, chaveOpenAi, erroOpenAi } = require('../openaiChat');
const { envOuSetting, getSetting, setSetting } = require('../settings');

const OPENAI_IMAGENS_URL = 'https://api.openai.com/v1/images/generations';

// Uma imagem leva bem mais que uma resposta de texto: no mínimo 3 minutos
const TIMEOUT_MINIMO_MS = 180000;

// A legenda leva o pedido, cortado se for longo
const LEGENDA_MAX = 200;

// /desenhe -m: sem modelo lista o atual e os aceitos; com modelo, grava o setting
async function trocarModelo(msg, modelo) {
    if (!modelo) {
        const atual = getSetting('openai.image.model');
        await msg.reply(`🎨 *Modelo do /desenhe:* ${atual}\n\n*Aceitos:*\n` +
            OPENAI_MODELOS_IMAGEM.map(m => `${m === atual ? '✅' : '▫️'} ${m}`).join('\n') +
            '\n\n💡 _/desenhe -m <modelo> troca (setting openai.image.model)._');
        return;
    }

    try {
        await setSetting('openai.image.model', modelo);
    } catch (e) {
        await msg.reply(`❌ Modelo ${e.message}`);
        return;
    }
    await msg.reply(`✅ Modelo do /desenhe: *${getSetting('openai.image.model')}*`);
}

/**
 * Pede a imagem à OpenAI e devolve o PNG em base64.
 * Em erro, registra no log (sem a chave) e lança o erro do axios.
 */
async function gerarImagem(pedido) {
    try {
        const { data } = await axios.post(OPENAI_IMAGENS_URL, {
            model: getSetting('openai.image.model'),
            prompt: pedido,
            n: 1,
            size: '1024x1024'
        }, {
            headers: { Authorization: `Bearer ${chaveOpenAi()}` },
            timeout: Math.max(envOuSetting('OPENAI_TIMEOUT_MS', 'openai.timeout.ms'), TIMEOUT_MINIMO_MS)
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

async function cmdDesenhe({ msg, args, opts, quotedMsg }) {
    if (opts?.given.has('model')) {
        await trocarModelo(msg, opts.opt.model);
        return;
    }

    if (!chaveOpenAi()) {
        await msg.reply(SEM_CHAVE('/desenhe'));
        return;
    }

    // Respondendo uma mensagem, o texto dela entra antes do pedido
    const pedido = [quotedMsg?.body, args].filter(Boolean).join('\n\n').trim();

    if (!pedido) {
        await msg.reply('```' + getCommandSyntax('/desenhe') + '```');
        return;
    }

    try {
        await msg.reply('🎨 Desenhando, aguarde…');
        const base64 = await gerarImagem(pedido);

        const legenda = pedido.length > LEGENDA_MAX ? `${pedido.slice(0, LEGENDA_MAX)}…` : pedido;
        await msg.reply(new MessageMedia('image/png', base64, 'desenho.png'), undefined, { caption: `🎨 ${legenda}` });
    } catch (err) {
        await msg.reply(erroOpenAi(err, '/desenhe'));
    }
}

module.exports = {
    cmdDesenhe
};
