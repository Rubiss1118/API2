
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: false,
  baseHref: '/API2/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "redirectTo": "/API2/login",
    "route": "/API2"
  },
  {
    "renderMode": 2,
    "route": "/API2/login"
  },
  {
    "renderMode": 2,
    "route": "/API2/registro"
  },
  {
    "renderMode": 2,
    "route": "/API2/bienvenida"
  },
  {
    "renderMode": 2,
    "redirectTo": "/API2/login",
    "route": "/API2/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 16600, hash: '808c6da22153f52c81f34b6db8120be20596aa397ca01420797c27c94e7828aa', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 17140, hash: '56378f6128eaa4b2aae02d8880ef3003875de2af0f7694c5201d90d4a84f78c8', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'bienvenida/index.html': {size: 20846, hash: '955425271663fadb81bdb4fb1aa4e9078f87e25a461ffed91432a864d749cced', text: () => import('./assets-chunks/bienvenida_index_html.mjs').then(m => m.default)},
    'login/index.html': {size: 20846, hash: '955425271663fadb81bdb4fb1aa4e9078f87e25a461ffed91432a864d749cced', text: () => import('./assets-chunks/login_index_html.mjs').then(m => m.default)},
    'registro/index.html': {size: 21922, hash: '1e5f72b390f8e42fa7148d7b85dcdd565304e723130825de3b64214aadfc2f89', text: () => import('./assets-chunks/registro_index_html.mjs').then(m => m.default)}
  },
};
