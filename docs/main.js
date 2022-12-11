'use strict';

import { Twitter } from './twitter.js';

const apiUrl = 'https://lmgo2fuffa.execute-api.ap-northeast-1.amazonaws.com';
const clientId = 'dFdQakVfTUJsZzU1eDdZU1A4U2w6MTpjaQ';
const redirectUrl = location.origin + location.pathname;
console.log('[redirect URL]', redirectUrl);

const twitter = new Twitter(clientId, redirectUrl, apiUrl);

window.addEventListener('DOMContentLoaded', async event => {
  console.log('[DOMContentLoaded]');

  // Signin
  document.getElementById('signin').addEventListener('click', event => {
    console.log('[signin.clicked]', event);
    authorize();
  });

  // Album
  document.getElementById('album').addEventListener('submit', async event => {
    console.log('[signin.clicked]', event);

    event.preventDefault();

    const { target: form, submitter } = event;
    submitter.disabled = true;
    const keyword = form.elements.keyword.value;

    try {
      const { id } = await createAlbum(keyword);
      console.log('[album id]', id);
    } catch (e) {
      submitter.disabled = false;
      return;
    }

    form.reset();
    submitter.disabled = false;
  });

  // Auth
  const params = new URLSearchParams(location.search);
  const newState = params.get('state');
  const code = params.get('code');
  if (newState && code) {
    console.log('[params]', newState, code);
    await fetchAndSaveAccessToken(newState, code);
    DeleteURLSearchParams();
  }

  await listAlbums(194534641);
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

async function createAlbum(keyword) {
  const authorization = getAuthorizationHeader();
  if (authorization == null) {
    throw new Error('Not authorized.');
  }

  const response = await fetch(`${apiUrl}/albums`, {
    method: 'POST',
    headers: {
      'Authorization': authorization,
    },
    body: JSON.stringify({
      keyword,
    }),
  });

  if (!response.ok) {
    throw new Error('Cannot create album.');
  }

  return await response.json();
}

async function listAlbums(userId) {
  const { albums } = await fetchAlbms(userId);
  const albumsList = document.getElementById('albums');
  for (const album of albums) {
    const li = document.createElement('li');
    li.textContent = JSON.stringify(album);
    albumsList.appendChild(li);
  }
}

async function fetchAlbms(userId) {
  const response = await fetch(`${apiUrl}/${userId}/albums`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Cannot get albums.');
  }

  return await response.json();
}

function getAuthorizationHeader() {
  const user = localStorage.getItem('user');
  console.log('[user]', user);

  if (!user) {
    console.error('[unauthorized]');
    return null;
  }

  const { id: userId, access_token: accessToken } = JSON.parse(user);
  return `${userId}:${accessToken}`;
}

function DeleteURLSearchParams() {
  history.pushState(null, '', location.origin + location.pathname);
}

function randomString(length) {
  return chance.string({ length, pool: '0123456789abcdef' });
}
