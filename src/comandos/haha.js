/*
 * Comando /haha: uma risada aleatória, em um de quatro estilos. Respondendo
 * uma mensagem, a risada vai em cima dela.
 */

// Inteiro sorteado de min a max (inclusive)
const sortear = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const escolher = (lista) => lista[Math.floor(Math.random() * lista.length)];

const CORES = ['❤️', '🧡', '💛', '💚', '💙', '💜'];
const FONTES = ['𝐇𝐀', '𝗛𝗔', '𝙃𝘼', '𝓗𝓐', 'ＨＡ', 'ʜᴀ', 'ᴴᴬ', 'ₕₐ'];

const ESTILOS = {
    // AHHAhaₕₐₐₕah repetido
    subscrito: () => 'AHHAhaₕₐₐₕah'.repeat(sortear(15, 25)),
    // HA entre corações nas cores do arco-íris
    arcoiris: () => Array.from({ length: sortear(12, 20) }, (_, i) => `${CORES[i % CORES.length]}HA`).join('') + CORES[0],
    // kkkk com maiúsculas e minúsculas misturadas
    kkk: () => Array.from({ length: sortear(30, 60) }, () => escolher(['k', 'K'])).join(''),
    // HA, cada um numa fonte diferente
    fontes: () => Array.from({ length: sortear(10, 18) }, () => escolher(FONTES)).join('')
};

async function cmdHaha({ msg, quotedMsg }) {
    const risada = ESTILOS[escolher(Object.keys(ESTILOS))]();
    await (quotedMsg ?? msg).reply(risada);
}

module.exports = {
    ESTILOS,
    cmdHaha
};
