'use strict';

export class Twitter {
  #clientId;
  #redirectUrl;
  #apiUrl;

  constructor(clientId, redirectUrl, apiUrl) {
    this.#clientId = clientId;
    this.#redirectUrl = redirectUrl;
    this.#apiUrl = apiUrl;
  }

  constructAuthorizeUrl(state, verifier) {
    const url = 'https://twitter.com/i/oauth2/authorize'
      + '?response_type=code'
      + `&client_id=${this.#clientId}`
      + `&redirect_uri=${this.#redirectUrl}`
      + '&scope=tweet.read users.read offline.access'
      + `&state=${state}`
      + `&code_challenge=${verifier}`
      + '&code_challenge_method=plain';
    return encodeURI(url);
  }

  async fetchAccessToken(code, verifier) {
    const url = `${this.#apiUrl}/auth`;
    console.log('[fetch]', url);
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        code,
        verifier,
        redirectUrl: this.#redirectUrl,
      }),
    });

    if (!response.ok) {
      throw Error('Cannot get access token.');
    }

    return await response.json();
  }
}
