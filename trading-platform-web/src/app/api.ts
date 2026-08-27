// single place for the api base url
// relative so the same path works everywhere: ng serve proxies /api to :5106
// (proxy.conf.json) and nginx proxies it to the api container in docker
export const API_BASE = '/api';
