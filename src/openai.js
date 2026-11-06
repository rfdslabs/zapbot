/*
 * Modelos da OpenAI aceitos pelo /gpt (endpoint v1/chat/completions).
 * Lista conferida em 30/09/2026 em developers.openai.com/api/docs/models: ficam
 * de fora os "pro"/"codex" (só Responses API), a família o* (descontinuada) e
 * os de áudio, imagem e embeddings.
 */
const OPENAI_MODELOS = [
    'gpt-6-astra', 'gpt-6.1-sol', 'gpt-6-sol', 'gpt-6-luna',
    'gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna',
    'gpt-5.5', 'gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-5.2', 'gpt-5.1',
    'gpt-4.1', 'gpt-4.1-mini', 'gpt-4o', 'gpt-4o-mini'
];

/*
 * Modelos de imagem aceitos pelo /desenhe (endpoint v1/images/generations).
 * Lista conferida em 20/10/2026 no v1/models; os 2.6 entraram em 06/11/2026.
 */
const OPENAI_MODELOS_IMAGEM = [
    'gpt-image-2.6-sunburst', 'gpt-image-2.6-flare', 'gpt-image-2.5-sunburst', 'gpt-image-2.5-flare', 'gpt-image-2',
    'gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini'
];

// Só a família 2.6 devolve GIF animado (output_format: "gif") no Image API
const OPENAI_MODELOS_GIF = ['gpt-image-2.6-flare', 'gpt-image-2.6-sunburst'];

module.exports = {
    OPENAI_MODELOS,
    OPENAI_MODELOS_GIF,
    OPENAI_MODELOS_IMAGEM
};
