'use strict';

import { Twitter } from './twitter.js';

const apiUrl = 'https://lmgo2fuffa.execute-api.ap-northeast-1.amazonaws.com';
const clientId = 'dFdQakVfTUJsZzU1eDdZU1A4U2w6MTpjaQ';
const redirectUrl = location.origin + location.pathname;
console.log('[redirect URL]', redirectUrl);

const twitter = new Twitter(clientId, redirectUrl, apiUrl);

window.addEventListener('DOMContentLoaded', async event => {
  console.log('[DOMContentLoaded]');

  const signin = document.getElementById('signin');
  signin.addEventListener('click', event => {
    console.log('[signin.clicked]', event);
    authorize();
  });

  const params = new URLSearchParams(location.search);
  const newState = params.get('state');
  const code = params.get('code');
  if (newState && code) {
    console.log('[params]', newState, code);
    await fetchAndSaveAccessToken(newState, code);
    DeleteURLSearchParams();
  }
});

function authorize() {
  const state = randomString(10);
  const verifier = randomString(43);
  const authorizeUrl = twitter.constructAuthorizeUrl(state, verifier);
  console.log('[authorize URL]', authorizeUrl);

  sessionStorage.setItem('session', `${state}&${verifier}`);
  console.log('[session]', sessionStorage.getItem('session'));
  window.location.href = authorizeUrl;
}

async function fetchAndSaveAccessToken(newState, code) {
  const session = sessionStorage.getItem('session');
  if (!session) {
    throw new Error("state and verifier doesn't exist.");
  }

  const [savedState, savedVerifier] = session.split('&');
  sessionStorage.clear();
  console.log('[session]', savedState, savedVerifier);
  if (newState === savedState) {
    const user = await twitter.fetchAccessToken(code, savedVerifier);
    console.log('[token]', user);
    localStorage.setItem('user', JSON.stringify(user));
  }
}

function DeleteURLSearchParams() {
  history.pushState(null, '', location.origin + location.pathname);
}

function randomString(length) {
  return chance.string({ length, pool: '0123456789abcdef' });
}
