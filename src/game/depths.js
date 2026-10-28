// Profundidade das camadas acima do mundo (sombra longa, noite, efeitos e interface).
// O mundo ordena por y (até ~17 100 px nas salas das cavernas); tudo que precisa ficar por cima
// do mundo soma OVERLAY_DEPTH, senão objetos com y alto passavam por cima da escuridão da noite.
export const OVERLAY_DEPTH = 100000;
