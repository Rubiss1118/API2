
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: false,
  baseHref: '/APIS/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "redirectTo": "/APIS/login",
    "route": "/APIS"
  },
  {
    "renderMode": 2,
    "route": "/APIS/login"
  },
  {
    "renderMode": 2,
    "route": "/APIS/registro"
  },
  {
    "renderMode": 2,
    "route": "/APIS/bienvenida"
  },
  {
    "renderMode": 2,
    "redirectTo": "/APIS/login",
    "route": "/APIS/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 16600, hash: 'f4af26ded78b9ebfabf1771358078983b2af7980259383507ff4de29b1722b1d', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 17140, hash: 'a4d64c9e5b7807bb0e20dcdcb65ded7feb594372a381d9f10c6039116fd4bd55', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'bienvenida/index.html': {size: 20846, hash: '0686accb437aa9779e09b892f74abc239041c7b2e5bfa1b94253314b077a2c2a', text: () => import('./assets-chunks/bienvenida_index_html.mjs').then(m => m.default)},
    'login/index.html': {size: 20846, hash: '0686accb437aa9779e09b892f74abc239041c7b2e5bfa1b94253314b077a2c2a', text: () => import('./assets-chunks/login_index_html.mjs').then(m => m.default)},
    'registro/index.html': {size: 21922, hash: '31753313ccf11080a97e4003e6cab6d43a6c02724fedf78909317442145e7389', text: () => import('./assets-chunks/registro_index_html.mjs').then(m => m.default)}
  },
};
