const assert = require('node:assert/strict')
const { after, before, describe, it } = require('node:test')
const app = require('../src/app')

let server
let baseUrl

before(async () => {
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const { port } = server.address()
  baseUrl = `http://127.0.0.1:${port}/api`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
})

describe('API security baseline', () => {
  it('returns health status', async () => {
    const response = await fetch(`${baseUrl}/health`)
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.deepEqual(body, { status: 'ok' })
  })

  it('rejects unauthenticated protected requests', async () => {
    const response = await fetch(`${baseUrl}/map/config`)
    const body = await response.json()

    assert.equal(response.status, 401)
    assert.equal(body.message, '未提供有效的身份令牌。')
  })

  it('sets an auth cookie and returns a csrf token on login', async () => {
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '123456' }),
    })
    const body = await response.json()

    assert.equal(response.status, 200)
    assert.ok(response.headers.get('set-cookie')?.includes('csbdp_session='))
    assert.equal(typeof body.token, 'string')
    assert.equal(typeof body.csrfToken, 'string')
    assert.equal(body.user.role, 'admin')
  })

  it('rejects authenticated unsafe requests without csrf header', async () => {
    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '123456' }),
    })
    const cookie = loginResponse.headers.get('set-cookie')?.split(';')[0]

    const response = await fetch(`${baseUrl}/admin/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({}),
    })
    const body = await response.json()

    assert.equal(response.status, 403)
    assert.equal(body.message, 'CSRF 校验失败，请刷新页面后重试。')
  })
})
